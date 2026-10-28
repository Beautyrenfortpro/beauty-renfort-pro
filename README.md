# Beauty Renfort Pro

Application de mise en relation entre instituts de beauté et esthéticiennes indépendantes vérifiées,
pour les remplacements et les renforts. Version 0.1 : démonstration complète avec données fictives.

## Ce qui fonctionne

- **Côté institut** : publier une mission (dates, horaires, pause, prestations du catalogue, budget),
  recevoir les propositions, choisir une esthéticienne, voir le décompte (tarif + 15 % de frais de service),
  ses documents vérifiés, valider ou contester la prestation, annuler (avec indemnité si annulation tardive),
  alerte de vigilance URSSAF au-delà de 5 000 € HT par an.
- **Côté esthéticienne** : missions éligibles uniquement (diplôme, assurance, URSSAF, formations selon les
  prestations), tarif libre et contre-proposition, refus sans conséquence, agenda, désistement, déclaration
  de prestation réalisée, revenus, profil avec alertes d'expiration.
- **Démo** : bandeau pour avancer le temps d'un jour et réinitialiser. Les données restent dans le navigateur.

## Lancer en local

```bash
npm install
npm run dev      # application sur http://localhost:5173
npm test         # tests de la logique métier
npm run build    # version de production dans dist/
```

## Organisation du code

| Dossier | Contenu |
| --- | --- |
| `src/domain/` | Logique métier pure et testée : catalogue, prix, conformité, cycle de vie des missions |
| `src/data/` | Stockage de la démo (navigateur) et données fictives ; sera remplacé par Supabase |
| `src/pages/` | Écrans institut et esthéticienne |
| `src/ui/` | Composants partagés (icônes, ticket de mission, navigation) |
| `supabase/migrations/` | Schéma de base de données et règles d'accès, prêts à appliquer |

## Étapes suivantes

1. Créer le projet Supabase (région Europe), appliquer la migration, brancher l'inscription et les données.
2. Brancher Stripe Connect en mode test (paiements, versements, vérification d'identité).
3. Mettre en ligne sur Vercel, puis valider le cadre juridique avant les premières missions payantes.

Les exigences par prestation (`src/domain/catalogue.ts`) et les montants d'annulation sont à faire valider
par un avocat (cahier des charges, section 14).
