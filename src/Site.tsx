import { useEffect, useState } from 'react';
import App from './App';
import Landing from './Landing';

function readRoute(): 'console' | 'landing' {
  return window.location.hash.startsWith('#/console') ? 'console' : 'landing';
}

export default function Site() {
  const [route, setRoute] = useState<'console' | 'landing'>(readRoute);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(readRoute());
      if (readRoute() === 'console') window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('lp-body', route === 'landing');
  }, [route]);

  return route === 'console' ? <App /> : <Landing />;
}
