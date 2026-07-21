import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Game from './pages/game';
import { LanguageProvider } from './i18n/LanguageContext';
import { LootVisualQaStage } from './components/LootVisualQaStage';

const queryClient = new QueryClient();

function lootVisualQaEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('visualQa') === 'loot';
}

function Router() {
  if (lootVisualQaEnabled()) return <LootVisualQaStage />;
  return (
    <Switch>
      <Route path="/" component={Game} />
      <Route component={() => <div className="text-white p-8">Not Found</div>} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
