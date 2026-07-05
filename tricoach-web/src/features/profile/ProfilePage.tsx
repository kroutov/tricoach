import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';
import { ApiClientError } from '../../api/client';
import { getCalendarToken, rotateCalendarToken } from '../../api/me';
import {
  connectGarmin,
  disconnectGarmin,
  disconnectStrava,
  getGarminStatus,
  getStravaAuthUrl,
  getStravaStatus,
  syncGarmin,
  syncStrava,
} from '../../api/integrations';
import { adaptationTriggerLabel } from '../../lib/enumLabels';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

function ConnectionSection({
  title,
  status,
  isLoading,
  onDisconnect,
  onSync,
  isSyncing,
  isDisconnecting,
  children,
}: {
  title: string;
  status: { connected: boolean; connectedAt: string | null } | undefined;
  isLoading: boolean;
  onDisconnect: () => void;
  onSync: () => void;
  isSyncing: boolean;
  isDisconnecting: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <p className="font-semibold text-primary-text">{title}</p>
      {isLoading ? (
        <p className="mt-2 text-sm text-secondary-text">Chargement…</p>
      ) : status?.connected ? (
        <>
          <p className="mt-1 text-sm text-intensity-easy">
            Connecté{status.connectedAt ? ` depuis le ${dateFormatter.format(new Date(status.connectedAt))}` : ''}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="flex-1 rounded-control bg-brand py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Synchroniser
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="flex-1 rounded-control bg-secondary-background py-2 text-sm font-semibold text-primary-text disabled:opacity-60"
            >
              Déconnecter
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3">{children}</div>
      )}
    </Card>
  );
}

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [stravaMessage, setStravaMessage] = useState<string | null>(null);
  const [garminUsername, setGarminUsername] = useState('');
  const [garminPassword, setGarminPassword] = useState('');
  const [garminError, setGarminError] = useState<string | null>(null);
  const [syncResultMessage, setSyncResultMessage] = useState<string | null>(null);

  useEffect(() => {
    const stravaResult = searchParams.get('strava');
    if (stravaResult === 'success') {
      setStravaMessage('Strava connecté avec succès.');
      queryClient.invalidateQueries({ queryKey: ['strava', 'status'] });
    } else if (stravaResult === 'error') {
      setStravaMessage(`Échec de la connexion Strava : ${searchParams.get('message') ?? 'erreur inconnue'}.`);
    }
    if (stravaResult) {
      searchParams.delete('strava');
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stravaStatusQuery = useQuery({ queryKey: ['strava', 'status'], queryFn: getStravaStatus });
  const garminStatusQuery = useQuery({ queryKey: ['garmin', 'status'], queryFn: getGarminStatus });
  const calendarTokenQuery = useQuery({ queryKey: ['me', 'calendarToken'], queryFn: getCalendarToken });

  const connectStravaMutation = useMutation({
    mutationFn: async () => {
      const { url } = await getStravaAuthUrl();
      window.location.href = url;
    },
  });

  const disconnectStravaMutation = useMutation({
    mutationFn: disconnectStrava,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strava', 'status'] }),
  });

  const syncStravaMutation = useMutation({
    mutationFn: syncStrava,
    onSuccess: (result) => {
      setSyncResultMessage(formatSyncResult(result));
      queryClient.invalidateQueries({ queryKey: ['plans', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (err) => setSyncResultMessage(formatSyncError(err)),
  });

  const connectGarminMutation = useMutation({
    mutationFn: () => connectGarmin(garminUsername, garminPassword),
    onSuccess: () => {
      setGarminError(null);
      setGarminPassword('');
      queryClient.invalidateQueries({ queryKey: ['garmin', 'status'] });
    },
    onError: (err) => {
      setGarminError(
        err instanceof ApiClientError && err.code === 'garmin_invalid_credentials'
          ? 'Identifiants Garmin incorrects.'
          : 'Impossible de se connecter à Garmin.'
      );
    },
  });

  const disconnectGarminMutation = useMutation({
    mutationFn: disconnectGarmin,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['garmin', 'status'] }),
  });

  const syncGarminMutation = useMutation({
    mutationFn: syncGarmin,
    onSuccess: (result) => {
      setSyncResultMessage(formatSyncResult(result));
      queryClient.invalidateQueries({ queryKey: ['plans', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (err) => setSyncResultMessage(formatSyncError(err)),
  });

  const rotateCalendarTokenMutation = useMutation({
    mutationFn: rotateCalendarToken,
    onSuccess: (data) => queryClient.setQueryData(['me', 'calendarToken'], data),
  });

  const copyCalendarUrl = async () => {
    if (!calendarTokenQuery.data) return;
    await navigator.clipboard.writeText(calendarTokenQuery.data.url);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary-text">Profil</h1>
      <Card>
        <p className="font-semibold text-primary-text">{user?.fullName ?? 'Athlète'}</p>
        <p className="text-sm text-secondary-text">{user?.email}</p>
      </Card>

      {stravaMessage && (
        <div className="rounded-control bg-secondary-background p-3 text-sm text-primary-text">{stravaMessage}</div>
      )}

      <ConnectionSection
        title="Strava"
        status={stravaStatusQuery.data}
        isLoading={stravaStatusQuery.isLoading}
        onSync={() => syncStravaMutation.mutate()}
        onDisconnect={() => disconnectStravaMutation.mutate()}
        isSyncing={syncStravaMutation.isPending}
        isDisconnecting={disconnectStravaMutation.isPending}
      >
        <button
          type="button"
          onClick={() => connectStravaMutation.mutate()}
          disabled={connectStravaMutation.isPending}
          className="w-full rounded-control bg-brand py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Connecter Strava
        </button>
      </ConnectionSection>

      <ConnectionSection
        title="Garmin"
        status={garminStatusQuery.data}
        isLoading={garminStatusQuery.isLoading}
        onSync={() => syncGarminMutation.mutate()}
        onDisconnect={() => disconnectGarminMutation.mutate()}
        isSyncing={syncGarminMutation.isPending}
        isDisconnecting={disconnectGarminMutation.isPending}
      >
        <div className="space-y-2">
          <p className="text-xs text-secondary-text">
            Connexion via l'accès non-officiel Garmin Connect (identifiants Garmin, pas d'OAuth) — Garmin peut bloquer cet
            accès sans préavis.
          </p>
          <input
            type="email"
            placeholder="Email Garmin"
            value={garminUsername}
            onChange={(e) => setGarminUsername(e.target.value)}
            className="w-full rounded-control border border-separator bg-background px-2 py-2 text-primary-text"
          />
          <input
            type="password"
            placeholder="Mot de passe Garmin"
            value={garminPassword}
            onChange={(e) => setGarminPassword(e.target.value)}
            className="w-full rounded-control border border-separator bg-background px-2 py-2 text-primary-text"
          />
          {garminError && <p className="text-xs text-intensity-hard">{garminError}</p>}
          <button
            type="button"
            onClick={() => connectGarminMutation.mutate()}
            disabled={connectGarminMutation.isPending || !garminUsername || !garminPassword}
            className="w-full rounded-control bg-brand py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Connecter Garmin
          </button>
        </div>
      </ConnectionSection>

      <Card>
        <p className="font-semibold text-primary-text">Abonnement calendrier</p>
        <p className="mt-1 text-xs text-secondary-text">
          Abonnez-vous à ce flux en lecture seule depuis Google Calendar ("Autres agendas" → "Depuis une URL"), Apple
          Calendar ("Fichier" → "Nouvel abonnement calendrier") ou tout client compatible iCal.
        </p>
        {calendarTokenQuery.data && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              readOnly
              aria-label="URL du flux calendrier"
              value={calendarTokenQuery.data.url}
              className="w-full rounded-control border border-separator bg-background px-2 py-2 text-xs text-secondary-text"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyCalendarUrl}
                className="flex-1 rounded-control bg-secondary-background py-2 text-sm font-semibold text-primary-text"
              >
                Copier le lien
              </button>
              <button
                type="button"
                onClick={() => rotateCalendarTokenMutation.mutate()}
                disabled={rotateCalendarTokenMutation.isPending}
                className="flex-1 rounded-control bg-secondary-background py-2 text-sm font-semibold text-primary-text disabled:opacity-60"
              >
                Régénérer le lien
              </button>
            </div>
          </div>
        )}
      </Card>

      <button
        type="button"
        onClick={signOut}
        className="w-full rounded-control bg-secondary-background py-2 font-semibold text-primary-text"
      >
        Déconnexion
      </button>

      {syncResultMessage && (
        <Modal title="Synchronisation" onClose={() => setSyncResultMessage(null)}>
          <p className="whitespace-pre-line text-sm text-secondary-text">{syncResultMessage}</p>
          <button
            type="button"
            onClick={() => setSyncResultMessage(null)}
            className="mt-4 w-full rounded-control bg-brand py-2 font-semibold text-white"
          >
            Compris
          </button>
        </Modal>
      )}
    </div>
  );
}

function formatSyncResult(result: { activitiesIngested: number; adaptationEvents: { triggeredBy: keyof typeof adaptationTriggerLabel; actionTaken: string }[] }): string {
  const parts = [`${result.activitiesIngested} séance${result.activitiesIngested > 1 ? 's' : ''} importée${result.activitiesIngested > 1 ? 's' : ''}.`];
  if (result.adaptationEvents.length > 0) {
    parts.push(...result.adaptationEvents.map((event) => `${adaptationTriggerLabel[event.triggeredBy]} : ${event.actionTaken}`));
  }
  return parts.join('\n\n');
}

/** Sync used to fail with no visible feedback at all — this at least shows something went wrong, and what. */
function formatSyncError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.code === 'strava_not_connected' || err.code === 'garmin_not_connected') {
      return 'La connexion a expiré ou a été révoquée — déconnecte puis reconnecte le service.';
    }
    return `Échec de la synchronisation (${err.code}).`;
  }
  return 'Échec de la synchronisation — vérifie ta connexion internet et réessaie.';
}
