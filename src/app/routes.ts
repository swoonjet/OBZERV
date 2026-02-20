import { createBrowserRouter } from 'react-router';
import { Root } from './components/Root';
import { RecordView } from './components/RecordView';
import { ObservationsView } from './components/ObservationsView';
import { ObservationDetailView } from './components/ObservationDetailView';
import { PatternsView } from './components/PatternsView';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      Component: Root,
      children: [
        { index: true, Component: RecordView },
        { path: 'observations', Component: ObservationsView },
        { path: 'observation/:id', Component: ObservationDetailView },
        { path: 'patterns', Component: PatternsView },
      ],
    },
  ],
  { basename: '/OBZERV' }
);
