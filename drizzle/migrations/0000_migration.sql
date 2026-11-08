
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  data_nascimento date,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, data_nascimento, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NULLIF(NEW.raw_user_meta_data->>'data_nascimento', '')::date,
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = COALESCE(NULLIF(EXCLUDED.nome, ''), public.profiles.nome),
    data_nascimento = COALESCE(EXCLUDED.data_nascimento, public.profiles.data_nascimento),
    email = EXCLUDED.email;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.treinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (char_length(nome) BETWEEN 1 AND 120),
  modalidade text NOT NULL,
  modalidade_outro text,
  descricao text,
  data date NOT NULL,
  horario time NOT NULL,
  local text NOT NULL CHECK (char_length(local) BETWEEN 1 AND 200),
  limite_participantes integer NOT NULL CHECK (limite_participantes > 0),
  visibilidade text NOT NULL DEFAULT 'publico' CHECK (visibilidade IN ('publico','privado')),
  organizador_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.treinos (organizador_id);
CREATE INDEX ON public.treinos (data);

CREATE TABLE public.treino_codigos (
  treino_id uuid PRIMARY KEY REFERENCES public.treinos(id) ON DELETE CASCADE,
  codigo_acesso char(4) NOT NULL UNIQUE CHECK (codigo_acesso ~ '^[0-9]{4}$')
);

CREATE TABLE public.treino_acessos (
  treino_id uuid NOT NULL REFERENCES public.treinos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (treino_id, usuario_id)
);

CREATE TABLE public.participacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treino_id uuid NOT NULL REFERENCES public.treinos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (treino_id, usuario_id)
);
CREATE INDEX ON public.participacoes (usuario_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.treinos TO authenticated;
GRANT SELECT ON public.treino_codigos TO authenticated;
GRANT SELECT ON public.treino_acessos TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.participacoes TO authenticated;
GRANT ALL ON public.treinos, public.treino_codigos, public.treino_acessos, public.participacoes TO service_role;

ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treino_codigos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treino_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participacoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.pode_ver_treino(_treino_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.treinos t WHERE t.id = _treino_id AND (
      t.visibilidade = 'publico'
      OR t.organizador_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.treino_acessos a WHERE a.treino_id = t.id AND a.usuario_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.participacoes p WHERE p.treino_id = t.id AND p.usuario_id = auth.uid())
    )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.pode_ver_treino(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_treino(uuid) TO authenticated;

CREATE POLICY "treinos visiveis" ON public.treinos FOR SELECT TO authenticated USING (public.pode_ver_treino(id));
CREATE POLICY "treinos criar" ON public.treinos FOR INSERT TO authenticated WITH CHECK (organizador_id = auth.uid());
CREATE POLICY "treinos editar" ON public.treinos FOR UPDATE TO authenticated USING (organizador_id = auth.uid()) WITH CHECK (organizador_id = auth.uid());
CREATE POLICY "treinos excluir" ON public.treinos FOR DELETE TO authenticated USING (organizador_id = auth.uid());

CREATE POLICY "codigo do organizador" ON public.treino_codigos FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.treinos t WHERE t.id = treino_id AND t.organizador_id = auth.uid()));

CREATE POLICY "proprio acesso" ON public.treino_acessos FOR SELECT TO authenticated USING (usuario_id = auth.uid());

CREATE POLICY "participacoes visiveis" ON public.participacoes FOR SELECT TO authenticated
USING (usuario_id = auth.uid() OR public.pode_ver_treino(treino_id));
CREATE POLICY "criar propria participacao" ON public.participacoes FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid() AND public.pode_ver_treino(treino_id));
CREATE POLICY "remover propria participacao" ON public.participacoes FOR DELETE TO authenticated
USING (usuario_id = auth.uid());

-- código privado automático
CREATE OR REPLACE FUNCTION public.gerar_codigo_treino()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; tentativas int := 0;
BEGIN
  IF NEW.visibilidade = 'privado' THEN
    IF NOT EXISTS (SELECT 1 FROM public.treino_codigos WHERE treino_id = NEW.id) THEN
      LOOP
        c := lpad(floor(random()*10000)::int::text, 4, '0');
        BEGIN
          INSERT INTO public.treino_codigos (treino_id, codigo_acesso) VALUES (NEW.id, c);
          EXIT;
        EXCEPTION WHEN unique_violation THEN
          tentativas := tentativas + 1;
          IF tentativas > 50 THEN RAISE EXCEPTION 'Não foi possível gerar um código único'; END IF;
        END;
      END LOOP;
    END IF;
  ELSE
    DELETE FROM public.treino_codigos WHERE treino_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER treinos_codigo AFTER INSERT OR UPDATE OF visibilidade ON public.treinos
FOR EACH ROW EXECUTE FUNCTION public.gerar_codigo_treino();

-- limite de vagas
CREATE OR REPLACE FUNCTION public.validar_vaga()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE lim int; total int;
BEGIN
  SELECT limite_participantes INTO lim FROM public.treinos WHERE id = NEW.treino_id FOR UPDATE;
  IF lim IS NULL THEN RAISE EXCEPTION 'Treino não encontrado'; END IF;
  SELECT count(*) INTO total FROM public.participacoes WHERE treino_id = NEW.treino_id;
  IF total >= lim THEN RAISE EXCEPTION 'TREINO_LOTADO' USING ERRCODE = 'P0001'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER participacoes_vaga BEFORE INSERT ON public.participacoes
FOR EACH ROW EXECUTE FUNCTION public.validar_vaga();

-- entrar com código
CREATE OR REPLACE FUNCTION public.entrar_com_codigo(_codigo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _codigo !~ '^[0-9]{4}$' THEN RETURN NULL; END IF;
  SELECT c.treino_id INTO tid FROM public.treino_codigos c WHERE c.codigo_acesso = _codigo;
  IF tid IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.treino_acessos (treino_id, usuario_id) VALUES (tid, auth.uid()) ON CONFLICT DO NOTHING;
  RETURN tid;
END $$;
REVOKE EXECUTE ON FUNCTION public.entrar_com_codigo(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.entrar_com_codigo(text) TO authenticated;

-- nomes de participantes / organizador (apenas nome)
CREATE OR REPLACE FUNCTION public.participantes_do_treino(_treino_id uuid)
RETURNS TABLE (usuario_id uuid, nome text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.usuario_id, COALESCE(NULLIF(pr.nome,''), 'Participante'), p.created_at
  FROM public.participacoes p LEFT JOIN public.profiles pr ON pr.id = p.usuario_id
  WHERE p.treino_id = _treino_id AND public.pode_ver_treino(_treino_id)
  ORDER BY p.created_at
$$;
REVOKE EXECUTE ON FUNCTION public.participantes_do_treino(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.participantes_do_treino(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.nome_organizador(_treino_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(pr.nome,''), 'Organizador')
  FROM public.treinos t LEFT JOIN public.profiles pr ON pr.id = t.organizador_id
  WHERE t.id = _treino_id AND public.pode_ver_treino(_treino_id)
$$;
REVOKE EXECUTE ON FUNCTION public.nome_organizador(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nome_organizador(uuid) TO authenticated;
