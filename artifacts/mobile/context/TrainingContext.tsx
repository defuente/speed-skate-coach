import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Lap, SessionConfig } from '@/types/training';
import { calculateSpeed } from '@/utils/calculations';

type TimerState = 'idle' | 'running' | 'paused' | 'finished';

export interface FinishResult {
  totalTime: number;
  laps: Lap[];
}

interface TrainingContextValue {
  timerState: TimerState;
  elapsed: number;
  currentLapTime: number;
  laps: Lap[];
  sessionConfig: SessionConfig;
  start: (config: SessionConfig) => void;
  pause: () => void;
  resume: () => void;
  addLap: () => void;
  finish: () => FinishResult | null;
  reset: () => void;
}

const DEFAULT_CONFIG: SessionConfig = {
  athleteName: '',
  trainingType: 'Resistencia',
  distancePerLap: 400,
};

const TrainingContext = createContext<TrainingContextValue>({
  timerState: 'idle',
  elapsed: 0,
  currentLapTime: 0,
  laps: [],
  sessionConfig: DEFAULT_CONFIG,
  start: () => {},
  pause: () => {},
  resume: () => {},
  addLap: () => {},
  finish: () => null,
  reset: () => {},
});

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [currentLapTime, setCurrentLapTime] = useState(0);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>(DEFAULT_CONFIG);

  // Refs for timing (immune to stale closure issues in setInterval)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerStateRef = useRef<TimerState>('idle');
  const startTimeRef = useRef(0);     // Date.now() when last started/resumed
  const baseElapsedRef = useRef(0);   // accumulated total ms before this run
  const lapStartRef = useRef(0);      // Date.now() when current lap started
  const lapBaseRef = useRef(0);       // accumulated lap ms before current run

  // Synchronous refs for finish()
  const lapsRef = useRef<Lap[]>([]);
  const sessionConfigRef = useRef<SessionConfig>(DEFAULT_CONFIG);

  const stopTick = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTick = useCallback(() => {
    stopTick();
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      setElapsed(baseElapsedRef.current + (now - startTimeRef.current));
      setCurrentLapTime(lapBaseRef.current + (now - lapStartRef.current));
    }, 50);
  }, [stopTick]);

  const start = useCallback(
    (config: SessionConfig) => {
      sessionConfigRef.current = config;
      lapsRef.current = [];
      setSessionConfig(config);
      setLaps([]);
      setElapsed(0);
      setCurrentLapTime(0);

      const now = Date.now();
      startTimeRef.current = now;
      lapStartRef.current = now;
      baseElapsedRef.current = 0;
      lapBaseRef.current = 0;
      timerStateRef.current = 'running';
      setTimerState('running');
      startTick();
    },
    [startTick],
  );

  const pause = useCallback(() => {
    if (timerStateRef.current !== 'running') return;
    stopTick();
    const now = Date.now();
    baseElapsedRef.current += now - startTimeRef.current;
    lapBaseRef.current += now - lapStartRef.current;
    timerStateRef.current = 'paused';
    setTimerState('paused');
    setElapsed(baseElapsedRef.current);
    setCurrentLapTime(lapBaseRef.current);
  }, [stopTick]);

  const resume = useCallback(() => {
    if (timerStateRef.current !== 'paused') return;
    const now = Date.now();
    startTimeRef.current = now;
    lapStartRef.current = now;
    timerStateRef.current = 'running';
    setTimerState('running');
    startTick();
  }, [startTick]);

  const addLap = useCallback(() => {
    if (timerStateRef.current !== 'running') return;
    const now = Date.now();
    const lapTime = lapBaseRef.current + (now - lapStartRef.current);
    const cumulative = baseElapsedRef.current + (now - startTimeRef.current);
    const dist = sessionConfigRef.current.distancePerLap;
    const speed = dist > 0 ? calculateSpeed(dist, lapTime) : undefined;

    setLaps(prev => {
      const newLap: Lap = { number: prev.length + 1, lapTime, cumulativeTime: cumulative, speed };
      const newLaps = [...prev, newLap];
      lapsRef.current = newLaps;
      return newLaps;
    });

    // Reset lap timer
    lapStartRef.current = now;
    lapBaseRef.current = 0;
    setCurrentLapTime(0);
  }, []);

  const finish = useCallback((): FinishResult | null => {
    const state = timerStateRef.current;
    if (state === 'idle') return null;

    stopTick();
    let totalTime: number;

    if (state === 'running') {
      const now = Date.now();
      totalTime = baseElapsedRef.current + (now - startTimeRef.current);
      baseElapsedRef.current = totalTime;
    } else {
      totalTime = baseElapsedRef.current;
    }

    timerStateRef.current = 'finished';
    setTimerState('finished');
    setElapsed(totalTime);

    return { totalTime, laps: lapsRef.current };
  }, [stopTick]);

  const reset = useCallback(() => {
    stopTick();
    lapsRef.current = [];
    timerStateRef.current = 'idle';
    setTimerState('idle');
    setElapsed(0);
    setCurrentLapTime(0);
    setLaps([]);
    baseElapsedRef.current = 0;
    lapBaseRef.current = 0;
  }, [stopTick]);

  return (
    <TrainingContext.Provider
      value={{ timerState, elapsed, currentLapTime, laps, sessionConfig, start, pause, resume, addLap, finish, reset }}
    >
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  return useContext(TrainingContext);
}
