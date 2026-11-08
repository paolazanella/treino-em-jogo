DROP POLICY "treinos visiveis" ON public.treinos;
CREATE POLICY "treinos visiveis" ON public.treinos FOR SELECT TO authenticated
USING (organizador_id = auth.uid() OR visibilidade = 'publico' OR public.pode_ver_treino(id));