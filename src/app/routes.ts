import { createBrowserRouter } from 'react-router';
import { Root } from './components/Root';
import { RecordView } from './components/RecordView';
import { ObservationsView } from './components/ObservationsView';
import { ObservationDetailView } from './components/ObservationDetailView';
import { PatternsView } from './components/PatternsView';
import { ReflectView } from './components/ReflectView';
import { StreamView } from './components/StreamView';
import { SubscribePage } from './components/SubscribePage';
import { FeedView } from './components/FeedView';

// Match Vite's base path in both dev and prod
const basename = '/OBZERV';

export const router = createBrowserRouter(
  [
    // Public routes — no auth required
    { path: 'feed', Component: FeedView },
    { path: 'subscribe', Component: SubscribePage },

    // Auth-gated app shell
    {
      path: '/',
      Component: Root,
      children: [
        { index: true, Component: RecordView },
        { path: 'observations', Component: ObservationsView },
        { path: 'observation/:id', Component: ObservationDetailView },
        { path: 'patterns', Component: PatternsView },
        { path: 'reflect', Component: ReflectView },
        { path: 'stream', Component: StreamView },
      ],
    },
  ],
  { basename }
);
