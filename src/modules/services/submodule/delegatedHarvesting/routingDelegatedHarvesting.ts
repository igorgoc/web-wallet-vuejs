import { RouteRecordRaw } from 'vue-router';

export const DelegatedHarvestingRoutes: RouteRecordRaw[] = [
  {
    path: '/delegated-harvesting',
    name: 'ViewDelegatedHarvesting',
    component: () => import('@/modules/services/submodule/delegatedHarvesting/views/ViewDelegatedHarvesting.vue'),
    meta: {
      title: "Delegated Staking & Node Harvesting",
    }
  }
];
