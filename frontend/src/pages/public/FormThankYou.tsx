import { useEffect, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';

interface ThankYouState {
  formTitle?: string;
  isRedirect?: boolean;
  redirectUrl?: string;
  submissionId?: string;
}

export default function FormThankYou() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const state = (location.state || {}) as ThankYouState;
  const [countdown, setCountdown] = useState(5);

  const shouldRedirect = state.isRedirect && state.redirectUrl;

  useEffect(() => {
    if (!shouldRedirect) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = state.redirectUrl!;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [shouldRedirect, state.redirectUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
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
                <p className="text-sm text-blue-700">
                  You will be redirected in <strong>{countdown}</strong> second{countdown !== 1 ? 's' : ''}...
                </p>
              </div>
              <a
                href={state.redirectUrl}
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
