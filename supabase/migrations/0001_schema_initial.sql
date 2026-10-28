-- Beauty Renfort Pro — schéma initial (à appliquer sur un projet Supabase hébergé en Europe).
-- Pas encore utilisé par l'application : la démo stocke ses données dans le navigateur.
-- Montants en centimes (entiers). Règles d'accès (RLS) activées sur toutes les tables.

create extension if not exists pgcrypto;

-- ---------- Profils ----------

create type role_utilisateur as enum ('institut', 'estheticienne', 'admin');

create table profils (
  id uuid primary key references auth.users (id) on delete cascade,
  role role_utilisateur not null,
  cree_le timestamptz not null default now()
);

create table instituts (
  id uuid primary key default gen_random_uuid(),
  proprietaire_id uuid not null references profils (id) on delete restrict,
  nom text not null,
  siret char(14) not null,
  siret_verifie boolean not null default false,
  adresse text not null,
  ville text not null,
  latitude double precision,
  longitude double precision,
  cree_le timestamptz not null default now()
);

create table estheticiennes (
  id uuid primary key references profils (id) on delete cascade,
  prenom text not null,
  nom text not null,
  siret char(14) not null,
  disponible boolean not null default true,
  rayon_km integer not null default 10 check (rayon_km between 1 and 100),
  latitude double precision,
  longitude double precision,
  specialites text[] not null default '{}',
  -- Compte de paiement chez le prestataire agréé (Stripe Connect) : aucune donnée bancaire stockée ici.
  compte_paiement_id text,
  cree_le timestamptz not null default now()
);

-- Justificatifs : les fichiers sont dans un espace de stockage privé ; seul le chemin est conservé.
create type type_justificatif as enum (
  'identite', 'siret', 'diplome', 'assurance', 'urssaf', 'formation_lumiere_pulsee', 'declaration_ars'
);

create table justificatifs (
  id uuid primary key default gen_random_uuid(),
  estheticienne_id uuid not null references estheticiennes (id) on delete cascade,
  type type_justificatif not null,
  chemin_fichier text,
  verifie boolean not null default false,
  verifie_par uuid references profils (id),
  verifie_le timestamptz,
  expire_le date,
  motif_refus text,
  cree_le timestamptz not null default now()
);
create index on justificatifs (estheticienne_id, type);

-- ---------- Missions ----------

create type motif_mission as enum ('remplacement', 'renfort', 'evenement');
create type statut_mission as enum ('publiee', 'confirmee', 'realisee', 'validee', 'payee', 'litige', 'annulee', 'expiree');

create table missions (
  id uuid primary key default gen_random_uuid(),
  institut_id uuid not null references instituts (id) on delete restrict,
  motif motif_mission not null,
  jours date[] not null check (cardinality(jours) between 1 and 31),
  heure_debut time not null,
  heure_fin time not null,
  pause_minutes integer not null default 0 check (pause_minutes >= 0),
  prestations text[] not null check (cardinality(prestations) > 0),
  materiel_fourni boolean not null default true,
  budget_horaire integer not null check (budget_horaire > 0),
  date_limite_reponse timestamptz not null,
  statut statut_mission not null default 'publiee',
  estheticienne_id uuid references estheticiennes (id),
  tarif_retenu integer check (tarif_retenu > 0),
  cree_le timestamptz not null default now(),
  confirmee_le timestamptz,
  declaree_realisee_le timestamptz,
  validee_le timestamptz,
  payee_le timestamptz,
  annulee_par text check (annulee_par in ('institut', 'estheticienne')),
  annulee_le timestamptz,
  indemnite_annulation integer not null default 0,
  check (heure_fin > heure_debut)
);
create index on missions (statut, institut_id);
create index on missions (estheticienne_id);

create table propositions (
  mission_id uuid not null references missions (id) on delete cascade,
  estheticienne_id uuid not null references estheticiennes (id) on delete cascade,
  -- Le tarif est fixé librement par l'esthéticienne (indépendance).
  tarif_horaire integer not null check (tarif_horaire between 1000 and 20000),
  retiree boolean not null default false,
  cree_le timestamptz not null default now(),
  primary key (mission_id, estheticienne_id)
);

-- Contrat de prestation accepté par les deux parties, conservé tel quel.
create table contrats (
  mission_id uuid primary key references missions (id) on delete restrict,
  version_conditions text not null,
  accepte_institut_le timestamptz not null,
  accepte_estheticienne_le timestamptz not null
);

-- ---------- Paiements et factures ----------

create table paiements (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete restrict,
  montant_prestation integer not null,
  frais_service integer not null,
  total integer not null,
  reference_prestataire text, -- identifiant chez Stripe
  statut text not null check (statut in ('en_attente', 'debite', 'verse', 'rembourse', 'echec')),
  cree_le timestamptz not null default now()
);

create table factures (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions (id) on delete restrict,
  -- 'prestation' : émise au nom de l'esthéticienne (mandat de facturation) ; 'frais' : émise par la plateforme.
  type text not null check (type in ('prestation', 'frais', 'avoir')),
  emetteur text not null,
  numero text not null unique,
  montant_ht integer not null,
  tva integer not null default 0,
  chemin_pdf text,
  emise_le timestamptz not null default now()
);

create table avis (
  mission_id uuid not null references missions (id) on delete cascade,
  auteur_id uuid not null references profils (id),
  cible text not null check (cible in ('institut', 'estheticienne')),
  note smallint not null check (note between 1 and 5),
  commentaire text,
  date_experience date not null,
  publie_le timestamptz not null default now(),
  primary key (mission_id, auteur_id)
);

-- ---------- Règles d'accès (RLS) ----------

alter table profils enable row level security;
alter table instituts enable row level security;
alter table estheticiennes enable row level security;
alter table justificatifs enable row level security;
alter table missions enable row level security;
alter table propositions enable row level security;
alter table contrats enable row level security;
alter table paiements enable row level security;
alter table factures enable row level security;
alter table avis enable row level security;

create function est_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profils where id = auth.uid() and role = 'admin');
$$;

create function mes_instituts() returns setof uuid language sql stable security definer set search_path = public as $$
  select id from instituts where proprietaire_id = auth.uid();
$$;

create policy "profil personnel" on profils for select using (id = auth.uid() or est_admin());

create policy "institut : lecture par son propriétaire" on instituts for select
  using (proprietaire_id = auth.uid() or est_admin());
create policy "institut : modification par son propriétaire" on instituts for update
  using (proprietaire_id = auth.uid());
create policy "institut : création" on instituts for insert with check (proprietaire_id = auth.uid());

create policy "esthéticienne : son profil" on estheticiennes for all
  using (id = auth.uid() or est_admin()) with check (id = auth.uid() or est_admin());
-- Un institut ne voit une esthéticienne que si elle lui a fait une proposition.
create policy "esthéticienne : visible par les instituts sollicités" on estheticiennes for select using (
  exists (
    select 1 from propositions p join missions m on m.id = p.mission_id
    where p.estheticienne_id = estheticiennes.id and m.institut_id in (select mes_instituts())
  )
);

-- Justificatifs : l'esthéticienne gère les siens ; l'institut ne les voit qu'avec une mission confirmée.
create policy "justificatifs : les miens" on justificatifs for all
  using (estheticienne_id = auth.uid() or est_admin()) with check (estheticienne_id = auth.uid() or est_admin());
create policy "justificatifs : institut avec mission confirmée" on justificatifs for select using (
  exists (
    select 1 from missions m
    where m.estheticienne_id = justificatifs.estheticienne_id
      and m.institut_id in (select mes_instituts())
      and m.statut in ('confirmee', 'realisee', 'validee', 'payee', 'litige')
  )
);

create policy "missions : lecture par mon institut" on missions for select
  using (institut_id in (select mes_instituts()) or est_admin());
-- L'institut publie ; les changements de statut passent ensuite par les fonctions serveur.
create policy "missions : publication par mon institut" on missions for insert
  with check (institut_id in (select mes_instituts()) and statut = 'publiee' and estheticienne_id is null);
-- L'éligibilité fine (justificatifs, prestations encadrées) est vérifiée côté serveur avant l'envoi.
create policy "missions : ouvertes ou attribuées, pour les esthéticiennes" on missions for select using (
  (statut = 'publiee' and exists (select 1 from estheticiennes e where e.id = auth.uid() and e.disponible))
  or estheticienne_id = auth.uid()
);

create policy "propositions : les miennes" on propositions for all
  using (estheticienne_id = auth.uid()) with check (estheticienne_id = auth.uid());
create policy "propositions : reçues par mon institut" on propositions for select using (
  exists (select 1 from missions m where m.id = propositions.mission_id and m.institut_id in (select mes_instituts()))
  or est_admin()
);

create policy "contrats, paiements, factures : parties à la mission" on contrats for select using (
  exists (select 1 from missions m where m.id = contrats.mission_id
          and (m.estheticienne_id = auth.uid() or m.institut_id in (select mes_instituts())))
  or est_admin()
);
create policy "paiements : parties à la mission" on paiements for select using (
  exists (select 1 from missions m where m.id = paiements.mission_id
          and (m.estheticienne_id = auth.uid() or m.institut_id in (select mes_instituts())))
  or est_admin()
);
create policy "factures : parties à la mission" on factures for select using (
  exists (select 1 from missions m where m.id = factures.mission_id
          and (m.estheticienne_id = auth.uid() or m.institut_id in (select mes_instituts())))
  or est_admin()
);

create policy "avis : lecture publique" on avis for select using (true);
create policy "avis : après une mission payée" on avis for insert with check (
  auteur_id = auth.uid()
  and exists (select 1 from missions m where m.id = avis.mission_id and m.statut = 'payee'
              and (m.estheticienne_id = auth.uid() or m.institut_id in (select mes_instituts())))
);

-- Les écritures sensibles (statuts, paiements, factures, vérification des justificatifs)
-- passeront par des fonctions serveur (Edge Functions) avec la clé de service, jamais depuis le téléphone.
