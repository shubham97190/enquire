import { useEffect, useState } from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';

interface ThankYouState {
  formTitle?: string;
  isRedirect?: boolean;
  redirectUrl?: string;
  redirectDelaySeconds?: number;
  submissionId?: string;
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

export default function FormThankYou() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as ThankYouState;
  const totalSeconds = Math.max(0, state.redirectDelaySeconds ?? 5);
  const [remainingMs, setRemainingMs] = useState(totalSeconds * 1000);
  const [fadingOut, setFadingOut] = useState(false);

  const shouldRedirect = state.isRedirect && !!state.redirectUrl;

  useEffect(() => {
    if (!shouldRedirect) return;

    if (totalSeconds === 0) {
      setFadingOut(true);
      const t = setTimeout(() => doRedirect(state.redirectUrl!), 200);
      return () => clearTimeout(t);
    }

    const startedAt = Date.now();
    let redirectTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      const remaining = Math.max(0, totalSeconds * 1000 - (Date.now() - startedAt));
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setFadingOut(true);
        redirectTimeoutId = setTimeout(() => doRedirect(state.redirectUrl!), 200);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (redirectTimeoutId !== undefined) clearTimeout(redirectTimeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRedirect, totalSeconds]);

  const doRedirect = (url: string) => {
    if (isSameOrigin(url)) {
      const target = new URL(url, window.location.origin);
      navigate(target.pathname + target.search + target.hash);
    } else {
      window.location.href = url;
    }
  };

  const progress = totalSeconds > 0 ? Math.max(0, Math.min(100, (remainingMs / (totalSeconds * 1000)) * 100)) : 0;
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div
        className={`w-full max-w-md text-center transition-opacity duration-200 ${fadingOut ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Success icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank You!</h2>
          <p className="text-gray-500 text-sm mb-6">
            {state.formTitle
              ? `Your response to "${state.formTitle}" has been submitted successfully.`
              : 'Your response has been submitted successfully.'}
          </p>

          {shouldRedirect ? (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-700 mb-2">
                  {totalSeconds === 0
                    ? 'Redirecting...'
                    : <>You will be redirected in <strong>{secondsLeft}</strong> second{secondsLeft !== 1 ? 's' : ''}...</>}
                </p>
                <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${progress}%`, transition: 'width 100ms linear' }}
                  />
                </div>
              </div>
              <a
                href={state.redirectUrl}
                onClick={(e) => {
                  if (state.redirectUrl) {
                    e.preventDefault();
                    doRedirect(state.redirectUrl);
                  }
                }}
                className="inline-block text-sm text-blue-600 hover:underline"
              >
                Click here if not redirected automatically
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {slug && (
                <Link
                  to={`/f/${slug}`}
                  className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition text-sm"
                >
                  Submit Another Response
                </Link>
              )}
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400 mt-6">Powered by Enquire</p>
      </div>
    </div>
  );
}
