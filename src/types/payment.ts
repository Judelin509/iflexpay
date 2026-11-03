export type PlanId = '1jour' | '1semaine' | '1mois';
export type PaymentMethod = 'moncash' | 'natcash';

export interface Plan {
  id: PlanId;
  duration: string;
  priceHTG: number;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: '1jour',
    duration: '1 Jour',
    priceHTG: 100,
  },
  {
    id: '1semaine',
    duration: '1 Semaine',
    priceHTG: 500,
    highlight: true,
  },
  {
    id: '1mois',
    duration: '1 Mois',
    priceHTG: 1500,
  },
];
