import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, updateAvailability, createCheckIn, createGoal, getGoals, updateUser } from '../../api/me';
import { generatePlan } from '../../api/plans';
import { useAuth } from '../auth/AuthContext';
import { PersonalInfoStep } from './steps/PersonalInfoStep';
import { SportLevelStep } from './steps/SportLevelStep';
import { HistoryStep } from './steps/HistoryStep';
import { GoalsStep } from './steps/GoalsStep';
import { AvailabilityStep } from './steps/AvailabilityStep';
import { ConstraintsStep } from './steps/ConstraintsStep';
import { SummaryStep } from './steps/SummaryStep';
import {
  ONBOARDING_STEPS,
  onboardingStepTitle,
  emptyProfile,
  defaultGoals,
  defaultAvailability,
  defaultCheckIn,
  type DraftProfile,
  type DraftGoal,
  type DraftAvailability,
  type DraftCheckIn,
} from './onboardingTypes';

export function OnboardingFlow() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [stepIndex, setStepIndex] = useState(0);
  const [profile, setProfile] = useState<DraftProfile>(emptyProfile);
  const [goals, setGoals] = useState<DraftGoal[]>(defaultGoals);
  const [availability, setAvailability] = useState<DraftAvailability>(defaultAvailability);
  const [checkIn, setCheckIn] = useState<DraftCheckIn>(defaultCheckIn);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentStep = ONBOARDING_STEPS[stepIndex];
  const progress = (stepIndex + 1) / ONBOARDING_STEPS.length;

  const canGoNext =
    currentStep === 'goals'
      ? goals.length > 0
      : currentStep === 'availability'
        ? availability.availableDays.length > 0 && availability.sessionsPerWeek > 0
        : true;

  const goNext = () => {
    if (!canGoNext || stepIndex >= ONBOARDING_STEPS.length - 1) return;
    setStepIndex((i) => i + 1);
  };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const finishOnboarding = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      await updateProfile(profile);
      await updateAvailability(availability);
      await createCheckIn(checkIn);
      for (const goal of goals) {
        await createGoal({ type: goal.type, targetDate: goal.targetDate, priority: goal.priority, targetTimeSeconds: goal.targetTimeSeconds });
      }

      // The server assigns real ids on creation — refetch rather than reuse the drafts' local ids.
      const savedGoals = await getGoals();
      const primaryGoal = savedGoals.find((g) => g.priority === 'a') ?? savedGoals[0];
      if (!primaryGoal) {
        setErrorMessage('Aucun objectif enregistré.');
        return;
      }

      await generatePlan({ goalId: primaryGoal.id });
      const updatedUser = await updateUser({ hasCompletedOnboarding: true });
      setUser(updatedUser);
      navigate('/');
    } catch {
      setErrorMessage('Impossible de générer le plan. Réessayez.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="px-4 pt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-pill bg-secondary-background">
          <div className="h-full rounded-pill bg-brand transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-1 text-sm text-secondary-text">{onboardingStepTitle[currentStep]}</p>
      </div>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-xl">
          {currentStep === 'personalInfo' && <PersonalInfoStep profile={profile} onChange={setProfile} />}
          {currentStep === 'sportLevel' && <SportLevelStep profile={profile} onChange={setProfile} />}
          {currentStep === 'history' && <HistoryStep profile={profile} onChange={setProfile} />}
          {currentStep === 'goals' && <GoalsStep goals={goals} onChange={setGoals} />}
          {currentStep === 'availability' && <AvailabilityStep availability={availability} onChange={setAvailability} />}
          {currentStep === 'constraints' && <ConstraintsStep checkIn={checkIn} onChange={setCheckIn} />}
          {currentStep === 'summary' && <SummaryStep profile={profile} goals={goals} availability={availability} checkIn={checkIn} />}

          {errorMessage && (
            <p className="mt-4 text-sm text-intensity-hard" role="alert">
              {errorMessage}
            </p>
          )}
        </div>
      </main>

      <div className="flex items-center justify-between bg-secondary-background p-4">
        {stepIndex > 0 ? (
          <button type="button" onClick={goBack} className="text-secondary-text">
            Retour
          </button>
        ) : (
          <span />
        )}

        {currentStep === 'summary' ? (
          <button
            type="button"
            onClick={finishOnboarding}
            disabled={isGenerating}
            className="rounded-control bg-brand px-6 py-2 font-semibold text-white disabled:opacity-60"
          >
            {isGenerating ? 'Génération…' : 'Générer mon plan'}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
            className="rounded-control bg-brand px-6 py-2 font-semibold text-white disabled:opacity-60"
          >
            Suivant
          </button>
        )}
      </div>
    </div>
  );
}
