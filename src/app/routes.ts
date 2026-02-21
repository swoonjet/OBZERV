import { createBrowserRouter } from 'react-router';
import { Root } from './components/Root';
import { RecordView } from './components/RecordView';
import { ObservationsView } from './components/ObservationsView';
import { ObservationDetailView } from './components/ObservationDetailView';
import { PatternsView } from './components/PatternsView';
import { ReflectView } from './components/ReflectView';

// Match Vite's base path in both dev and prod
const basename = '/OBZERV';

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
        { path: 'reflect', Component: ReflectView },
      ],
    },
  ],
  { basename }
);
