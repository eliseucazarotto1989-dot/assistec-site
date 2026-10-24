-- Pedidos enviados pelo site (projeto.html) para o Montador de Pedidos.
-- Rodar UMA vez no Supabase: menu "SQL Editor" > "New query" > colar tudo > "Run".
--
-- O que o site pode fazer (visitante, sem login): só ENVIAR um pedido novo.
-- Só a equipe (conta com role = 'admin' na tabela profiles) pode ver, marcar como atendido e apagar.
-- Dados pessoais guardados: apenas nome e telefone do cliente.

create table if not exists public.pedidos_site (
    id         uuid primary key default gen_random_uuid(),
    criado_em  timestamptz not null default now(),
    codigo     text not null unique check (codigo ~ '^[A-Z0-9]{6,10}$'),
    nome       text not null check (char_length(nome) between 2 and 80),
    telefone   text not null check (telefone ~ '^[0-9]{10,11}$'),
    itens      jsonb not null check (jsonb_typeof(itens) = 'array'
                                     and jsonb_array_length(itens) between 1 and 300
                                     and pg_column_size(itens) < 200000),
    pecas      integer not null default 0 check (pecas between 0 and 100000),
    status     text not null default 'novo' check (status in ('novo', 'atendido'))
);

alter table public.pedidos_site enable row level security;

-- permissões por coluna: o visitante não escolhe id, data nem status
revoke all on public.pedidos_site from anon, authenticated;
grant insert (codigo, nome, telefone, itens, pecas) on public.pedidos_site to anon, authenticated;
grant select, delete on public.pedidos_site to authenticated;
grant update (status) on public.pedidos_site to authenticated;

drop policy if exists "site envia pedido" on public.pedidos_site;
create policy "site envia pedido" on public.pedidos_site
    for insert to anon, authenticated
    with check (status = 'novo');

drop policy if exists "equipe ve pedidos" on public.pedidos_site;
create policy "equipe ve pedidos" on public.pedidos_site
    for select to authenticated
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "equipe atualiza pedidos" on public.pedidos_site;
create policy "equipe atualiza pedidos" on public.pedidos_site
    for update to authenticated
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
    with check (status in ('novo', 'atendido'));

drop policy if exists "equipe apaga pedidos" on public.pedidos_site;
create policy "equipe apaga pedidos" on public.pedidos_site
    for delete to authenticated
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create index if not exists pedidos_site_criado_em on public.pedidos_site (criado_em desc);

-- "despertador": o GitHub chama esta função a cada 3 dias (.github/workflows/manter-supabase-ativo.yml)
-- para o projeto gratuito não ser pausado por falta de uso. Não lê nem grava nenhum dado.
create or replace function public.ping() returns timestamptz
    language sql stable security invoker set search_path = '' as $$ select now() $$;
revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
