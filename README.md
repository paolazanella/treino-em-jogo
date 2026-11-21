# Treinaí

O **Treinaí** é uma aplicação web criada para facilitar a organização de treinos esportivos e substituir listas manuais normalmente compartilhadas em grupos de mensagens.

A plataforma permite criar treinos, controlar vagas, confirmar presença e organizar atividades públicas ou privadas.

## Aplicação

**Live app:** https://treino-em-jogo.lovable.app

## Sobre o projeto

O Treinaí surgiu a partir da dificuldade encontrada por grupos esportivos para organizar participantes, horários, locais e vagas de seus treinos.

A proposta é centralizar essas informações em uma única aplicação, permitindo que organizadores e participantes tenham acesso rápido às informações de cada atividade.

O projeto foi desenvolvido como MVP para a disciplina **Hands on Work X**, do curso de Análise e Desenvolvimento de Sistemas da UNIVALI.

## Funcionalidades

- Cadastro e autenticação de usuários
- Criação de treinos
- Diferentes modalidades esportivas
- Definição de data, horário e local
- Limite de participantes
- Visualização das vagas disponíveis
- Confirmação de presença
- Cancelamento de presença
- Lista de participantes
- Área "Meus treinos"
- Treinos públicos
- Treinos privados
- Código de acesso de 4 dígitos para treinos privados
- Compartilhamento das informações do treino
- Interface responsiva para computador e dispositivos móveis

## Treinos públicos e privados

### Público

Treinos públicos ficam disponíveis para os usuários da plataforma e podem ser acessados diretamente pela página inicial.

### Privado

Ao criar um treino privado, o sistema gera automaticamente um código numérico de quatro dígitos.

O organizador pode compartilhar esse código com os participantes, que utilizam a opção **Entrar com código** para acessar o treino.

## Fluxo básico

1. O usuário cria uma conta ou realiza login.
2. Visualiza os próximos treinos disponíveis.
3. Pode criar um novo treino.
4. Define se o treino será público ou privado.
5. Define modalidade, data, horário, local e quantidade de vagas.
6. Participantes podem confirmar presença.
7. O sistema atualiza automaticamente a quantidade de vagas disponíveis.
8. O usuário pode cancelar sua participação posteriormente.

## Tecnologias

O projeto utiliza:

- TypeScript
- Supabase
- PostgreSQL
- CSS
- JavaScript
- Lovable

## Desenvolvimento local

Para executar o projeto localmente, é necessário ter Node.js e npm instalados.

```sh
git clone <URL-DO-REPOSITORIO>
cd treino-em-jogo
npm i
npm run dev
```

## Desenvolvimento com Lovable

O projeto foi inicialmente desenvolvido utilizando o Lovable.

Alterações realizadas no Lovable podem ser sincronizadas com este repositório GitHub.


## Segurança

O sistema utiliza autenticação para identificar os usuários e políticas de acesso aos dados.

Informações pessoais, como e-mail e data de nascimento, não são exibidas nas listas de participantes.

O código de quatro dígitos dos treinos privados foi adotado para o escopo do MVP acadêmico e poderá ser substituído por mecanismos mais robustos em versões futuras.

## Validação

O MVP está sendo validado com usuários reais por meio de testes das principais funcionalidades e coleta de feedback sobre:

- facilidade de uso;
- organização das informações;
- confirmação de presença;
- acesso a treinos privados;
- utilidade da solução para grupos esportivos.

## Autor

**Leandro Pinto**

Análise e Desenvolvimento de Sistemas — UNIVALI

Projeto desenvolvido para a disciplina **Hands on Work X**.

## Status

MVP funcional em processo de validação com usuários reais.
