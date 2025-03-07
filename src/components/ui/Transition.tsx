
import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface TransitionProps {
  children: ReactNode;
}

export function Transition({ children }: TransitionProps) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut');
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (transitionStage === 'fadeOut') {
      setTransitionStage('fadeIn');
      setDisplayLocation(location);
    }
  };

  return (
    <div
      className={`transition-all duration-300 ${
        transitionStage === 'fadeIn' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
}
