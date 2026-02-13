import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useGameStore } from '../store';
import { Gamepad2, LogIn, UserPlus, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export const AuthPage: React.FC = () => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const navigate = useNavigate();
    const { session } = useGameStore();

    // If already logged in, redirect
    React.useEffect(() => {
        if (session) {
            navigate('/');
        }
    }, [session, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            navigate('/');
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signUp({ email, password });
        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            setSuccess('Account created! You can now log in.');
            setMode('login');
            setPassword('');
            setConfirmPassword('');
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) {
            setError(error.message);
        }
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="fade-in" style={{ maxWidth: '440px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <Gamepad2 size={48} style={{ color: 'var(--accent-primary)' }} />
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Game Hub
                        </h1>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                        {mode === 'login' ? 'Sign in to play with friends' : 'Create your account'}
                    </p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="alert alert-success">
                        <span>✅</span>
                        <span>{success}</span>
                    </div>
                )}

                <div className="card">
                    {/* Google Sign-In */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        style={{
                            width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
                            border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: '600',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', gap: '0.75rem',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>

                    <div style={{ position: 'relative', textAlign: 'center', margin: '1.5rem 0' }}>
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border-color)' }}></div>
                        <span style={{ position: 'relative', background: 'var(--bg-secondary)', padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            OR
                        </span>
                    </div>

                    <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label htmlFor="auth-email" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                                Email
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    id="auth-email"
                                    type="email"
                                    className="input"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ paddingLeft: '2.75rem' }}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label htmlFor="auth-password" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    id="auth-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                                    required
                                    minLength={6}
                                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem',
                                        display: 'flex', alignItems: 'center'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label htmlFor="auth-confirm-password" style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                                    Confirm Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        id="auth-confirm-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="input"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        style={{ paddingLeft: '2.75rem' }}
                                        required
                                        minLength={6}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }}
                        >
                            {loading ? (
                                <span style={{ opacity: 0.7 }}>Loading...</span>
                            ) : mode === 'login' ? (
                                <><LogIn size={20} /> Sign In</>
                            ) : (
                                <><UserPlus size={20} /> Create Account</>
                            )}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === 'login' ? 'register' : 'login');
                                setError(null);
                                setSuccess(null);
                            }}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: '500',
                                textDecoration: 'underline', padding: '0.25rem'
                            }}
                        >
                            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

