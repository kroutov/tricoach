import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerAccount } from '../../api/auth';
import { ApiClientError } from '../../api/client';
import { useAuth } from './AuthContext';
import { GoogleSignInButton } from './GoogleSignInButton';

const registerSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  fullName: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      const result = await registerAccount(data.email, data.password, data.fullName || undefined);
      signIn(result.token, result.user);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'email_taken') {
        setServerError('Un compte existe déjà avec cette adresse email.');
      } else {
        setServerError('Impossible de créer le compte. Réessayez.');
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary-text">TriCoach AI</h1>
          <p className="text-secondary-text">Créer un compte</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-primary-text mb-1">
              Nom complet (optionnel)
            </label>
            <input
              id="fullName"
              type="text"
              className="w-full rounded-control border border-separator px-2 py-2 bg-card-background text-primary-text"
              {...register('fullName')}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-primary-text mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-control border border-separator px-2 py-2 bg-card-background text-primary-text"
              {...register('email')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-intensity-hard mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary-text mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-control border border-separator px-2 py-2 bg-card-background text-primary-text"
              {...register('password')}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <p id="password-error" className="text-sm text-intensity-hard mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-intensity-hard" role="alert">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-control bg-brand text-white font-semibold py-2 disabled:opacity-60"
          >
            {isSubmitting ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <GoogleSignInButton />

        <p className="text-center text-sm text-secondary-text">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-brand font-medium">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
