'use client';

import { useState, useEffect, useCallback } from 'react';
import packageJson from '../package.json';

interface ValidationResult {
  ieee_number: string;
  name_initials: string | null;
  membership_status: string | null;
  member_grade: string | null;
  standards_association_member: string | null;
  society_memberships: string | null;
  error: string | null;
}

export default function Home() {
  const defaultCookie = 'eyJ6aXAiOiJERUYiLCJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoiN2h6bE02eUpLakZaRENCZ2k1bWRKeE5UTXdNIiwicGkuc3JpIjoiamhCdjBYQXN1ZjM1UkJ6RlhlQVVkbGpNdWFrLlRrbyJ9..zNSoi3Ww3RIjHC_hq76ydA.yXH-yAqiaMnJgPdXI1GqF_6Qt9GNezNbUhfHT8fLD-4NWEsY2o0NjkFg2BgCkv16ahbCqgD5_qFLTgeq7MLtlj65kvXjSQbZXAE61erVf8K76WkaY3lYFFFEA1zwJDOyBKKPjDyPE7ylODKjc7dS2XBlr-DHoFpUz1Xnb5rjzQY6DcF0qoa-LiiKRAkaEB9bDM3A7YFVrDVr2wV_fQMcztdCMwyTtzbfFBizRW5kSVPP5OUJ7usy_y3ymoxd-WAnzJGwRBpCzodTIqo2zn-I1V3QzB5Aym5Ev6uqtjhj2x8m9w3fDKJvZ3gSZIfOXIGz8nTQhO2tL6thR9h4kPLozi9FssJSjFrGf4Ghimt7tLiqoQOemwgP4VVmjzhnP7SA38mR-GSpTrUpZF7IfZW8ONuozmvqW0dDPwLNF2y8f5awp5yBuqJnJ72cyzdtVSpr3L4_OsiX4TLxOp0NBvWkKxO6M-_HwMP3-maVcMeu8hM_QAAtEqfJ5FgHcssJz0g4UoIFcY77DUXFr9g2KjjQwg3RKFC0iYXFejzwD5zJ1RyKx56BnRjos_96TGYr2DHeqkw03dEKMJB4C3g49yZyFSlyntxugyUr-jXbYaaHjnLbCPKiY2y3vhhSxkLScTBt0mjJ-T3j9O7zRRPZ1Cx5OA.Ow-37XuaS9XLjQoEtvvXQg';
  // Version automatically read from package.json
  const APP_VERSION = `v${packageJson.version}`;
  
  const [cookie, setCookie] = useState(defaultCookie);
  const [membershipIds, setMembershipIds] = useState('');
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [cookieLocked, setCookieLocked] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<{
    state: string | null;
    isReady: boolean;
    isBuilding: boolean;
    isError: boolean;
    url: string | null;
  } | null>(null);
  const [checkingDeployment, setCheckingDeployment] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState<string>('');

  const handleValidate = async () => {
    // First check: Empty membership IDs
    if (!membershipIds.trim()) {
      setRefreshMessage('⚠️ Please enter at least 1 membership number.');
      return;
    }

    // Parse membership IDs (split by newline, comma, or space)
    const ids = membershipIds
      .split(/[\n,\s]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (ids.length === 0) {
      setRefreshMessage('⚠️ Please enter at least 1 membership number.');
      return;
    }

    // Second check: Validator needs to be fired up
    if (countdown !== null && countdown > 0) {
      setRefreshMessage('⏳ Please wait for the validator to finish starting up. Click "Fire Up Validator API" if you haven\'t already.');
      return;
    }

    if (countdown === null && !refreshMessage) {
      setRefreshMessage('⚠️ Please click "Fire Up Validator API" before validating.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: ids.length });

    try {
      const allResults: ValidationResult[] = [];
      const batchSize = 10; // Process 10 at a time to avoid timeout
      let batchStart = 0;

      while (batchStart < ids.length) {
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cookie,
            membershipIds: ids,
            batchStart,
            batchSize,
          }),
        });

        if (!response.ok) {
          // Check for 404 error
          if (response.status === 404) {
            setRefreshMessage('⚠️ Please click "Fire Up Validator API" before validating.');
            setLoading(false);
            return;
          }
          const errorData = await response.json();
          throw new Error(errorData.error || 'Validation failed');
        }

      const data = await response.json();
      
      // Check if there are any successful results (results without errors)
      const hasSuccessfulResults = data.results.some((r: ValidationResult) => !r.error);
      
      // Only show errors if there are no successful results
      if (!hasSuccessfulResults) {
        // Check if any result has a 404 error
        const has404Error = data.results.some((r: ValidationResult) => 
          r.error && (r.error.includes('404') || r.error.includes('Not Found') || r.error.includes('Fire Up Validator'))
        );
        
        if (has404Error) {
          setRefreshMessage('⚠️ Please click "Fire Up Validator API" before validating.');
          break;
        }
        
        // Check if any result has a session expired or 401 error
        const hasSessionError = data.results.some((r: ValidationResult) => 
          r.error && (r.error.includes('Session expired') || r.error.includes('401') || r.error.includes('403'))
        );
        
        if (hasSessionError) {
          setCookieLocked(false); // Unlock cookie input on session error
          if (data.refreshTriggered) {
            setRefreshMessage('🔄 Session expired. Cookie refresh workflow has been automatically triggered. Please wait and try again.');
            setCountdown(90); // Restart countdown (1.5 minutes)
          } else {
            setRefreshMessage('⚠️ Session expired. Please click "Fire Up Validator API" to refresh.');
          }
          break;
        }
      }
      
      allResults.push(...data.results);
      setResults([...allResults]);
      setProgress({ current: allResults.length, total: ids.length });
      
      // Clear error messages if we have successful results
      if (hasSuccessfulResults) {
        setRefreshMessage(null);
      }

      if (!data.hasMore) {
        break;
      }

        batchStart = data.batchEnd;
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
    }

      setProgress({ current: allResults.length, total: ids.length });
      
      // Clear error messages if we have any successful results
      if (allResults.length > 0 && allResults.some((r: ValidationResult) => !r.error)) {
        setRefreshMessage(null);
      }
    } catch (err) {
      // Only show errors if we have no results or all results have errors
      // Use results state instead of allResults since it's updated throughout the try block
      const hasSuccessfulResults = results.length > 0 && results.some((r: ValidationResult) => !r.error);
      
      if (!hasSuccessfulResults) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        // Check for 404 errors
        if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
          setRefreshMessage('⚠️ Please click "Fire Up Validator API" before validating.');
        } else if (errorMessage.includes('Session') || errorMessage.includes('Cookie') || errorMessage.includes('401') || errorMessage.includes('403')) {
          setCookieLocked(false);
          setRefreshMessage('⚠️ Please click "Fire Up Validator API" to refresh the session.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (results.length === 0) return;

    // Convert results to CSV
    const headers = [
      'ieee_number',
      'name_initials',
      'membership_status',
      'member_grade',
      'standards_association_member',
      'society_memberships',
      'error',
    ];

    const csvRows = [
      headers.join(','),
      ...results.map(result =>
        headers.map(header => {
          const value = result[header as keyof ValidationResult];
          // Escape commas and quotes in CSV
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      ),
    ];

    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ieee_validation_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleRefreshValidator = async () => {
    setRefreshing(true);
    setRefreshMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/trigger-refresh', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger refresh');
      }

      setRefreshMessage('✅ Validator API refresh triggered! It will take approximately 1.5 minutes to complete.');
      setCountdown(90); // Start 1.5-minute countdown (90 seconds)
    } catch (err: any) {
      setRefreshMessage('⚠️ Failed to trigger refresh. Please try again.');
      setCountdown(null);
    } finally {
      setRefreshing(false);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      if (countdown === 0) {
        setCountdown(null);
        setRefreshMessage('✅ Validator API is ready! You can now start validating.');
        // Show popup when countdown finishes
        setPopupMessage('✅ Validator API is ready! You can now start validating.');
        setShowPopup(true);
        // Auto-check deployment status when countdown ends
        checkDeploymentStatus(false);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const checkDeploymentStatus = useCallback(async (suspendCountdownOnReady = false) => {
    setCheckingDeployment(true);
    try {
      const response = await fetch('/api/deployment-status');
      const data = await response.json();
      
      if (data.available && data.deployment) {
        const status = {
          state: data.deployment.state,
          isReady: data.isReady,
          isBuilding: data.isBuilding,
          isError: data.isError,
          url: data.deployment.url || null,
        };
        setDeploymentStatus(status);
        
        // If deployment is ready, show popup and suspend countdown if requested
        if (data.isReady && suspendCountdownOnReady) {
          setCountdown(null); // Suspend countdown
          setPopupMessage('🎉 Deployment is ready! Validator API is now available.');
          setShowPopup(true);
          setRefreshMessage('✅ Deployment is ready! Validator API is now available.');
        }
      } else {
        setDeploymentStatus({
          state: 'NOT_CONFIGURED',
          isReady: false,
          isBuilding: false,
          isError: false,
          url: null,
        });
      }
    } catch (err) {
      setDeploymentStatus({
        state: 'ERROR',
        isReady: false,
        isBuilding: false,
        isError: true,
        url: null,
      });
    } finally {
      setCheckingDeployment(false);
    }
  }, []);

  // Monitor countdown and check deployment status periodically
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    // Check deployment status every 10 seconds when countdown is active
    const interval = setInterval(() => {
      checkDeploymentStatus(true); // Suspend countdown if deployment is ready
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [countdown, checkDeploymentStatus]);

  return (
    <div className="min-h-screen bg-black">
      {/* Popup Modal */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 max-w-md w-full mx-4 border-2 border-black">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-black">
                Deployment Status
              </h2>
              <button
                onClick={() => setShowPopup(false)}
                className="text-black opacity-60 hover:opacity-100 transition-opacity text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="text-sm sm:text-base text-black mb-6">
              {popupMessage}
            </p>
            <button
              onClick={() => setShowPopup(false)}
              className="w-full px-4 py-2.5 bg-black text-white font-medium rounded hover:bg-gray-800 transition-colors text-sm sm:text-base"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="w-full border-b border-white bg-black py-3 px-3 sm:py-4 sm:px-6 lg:px-8">
        <div className="w-full flex items-center justify-between">
          <div className="text-white opacity-70 text-xs sm:text-sm font-mono">
            {APP_VERSION}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <p className="text-white opacity-70 text-[10px] sm:text-xs md:text-sm font-bold whitespace-nowrap">
              Crafted by Stark (Harsh)
            </p>
            <a
              href="https://github.com/StarkAg"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity text-white flex-shrink-0"
              aria-label="GitHub"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </header>
      
      <div className="py-6 sm:py-12 px-3 sm:px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 lg:p-8 border border-gray-200">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-2">
            IEEE Membership Validator
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
            <p className="text-xs sm:text-sm text-black opacity-70">
              Press the "Fire Up Validator API" button before validating. The validator takes approximately 1.5 minutes to fire up.
            </p>
            <button
              onClick={handleRefreshValidator}
              disabled={refreshing}
              className="relative px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-black via-gray-900 to-black text-white text-xs sm:text-sm font-medium rounded-lg overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 whitespace-nowrap shadow-lg hover:shadow-xl hover:shadow-white/10 hover:scale-105 active:scale-100 disabled:hover:scale-100 disabled:hover:shadow-lg group border border-white/10 hover:border-white/20"
            >
              {/* Continuous subtle shimmer effect */}
              <span className="absolute inset-0 shimmer-effect bg-gradient-to-r from-transparent via-white/5 to-transparent"></span>
              
              {/* Shine effect on hover */}
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/15 to-transparent"></span>
              
              {/* Subtle glow effect */}
              <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
              
              {/* Button text */}
              <span className="relative z-10 flex items-center gap-1.5">
                {refreshing ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <span className="text-yellow-300">⚡</span>
                    Fire Up Validator API
                  </>
                )}
              </span>
            </button>
          </div>
          {refreshMessage && (
            <div className={`mb-4 p-2 sm:p-3 rounded text-xs sm:text-sm ${
              refreshMessage.startsWith('✅') 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : refreshMessage.startsWith('⏳')
                ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                : 'bg-orange-50 border border-orange-200 text-orange-800'
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span>{refreshMessage}</span>
                {countdown !== null && countdown > 0 && (
                  <span className={`font-mono font-bold ${
                    refreshMessage.startsWith('✅') ? 'text-green-900' : 'text-yellow-900'
                  }`}>
                    ({Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')})
                  </span>
                )}
              </div>
            </div>
          )}
          <p className="text-sm sm:text-base text-black mb-6 sm:mb-8 opacity-70">
            Bulk validate IEEE membership numbers and extract membership details
          </p>

          <div className="space-y-6">
            {/* Cookie Input */}
            <div className="hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-1 sm:gap-0">
                <label htmlFor="cookie" className="block text-xs sm:text-sm font-medium text-black">
                  Authentication Cookie (PA.Global_Websession)
                </label>
                {cookieLocked && (
                  <button
                    type="button"
                    onClick={() => setCookieLocked(false)}
                    className="text-xs text-black opacity-60 hover:opacity-100 underline self-start sm:self-auto"
                  >
                    Unlock to edit
                  </button>
                )}
              </div>
              <input
                type="password"
                id="cookie"
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                disabled={cookieLocked}
                placeholder="Paste your PA.Global_Websession cookie here"
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-black rounded-lg focus:ring-2 focus:ring-black focus:outline-none bg-white text-black placeholder-gray-400 ${
                  cookieLocked ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              />
              <p className="mt-2 text-xs sm:text-sm text-black opacity-60">
                {cookieLocked 
                  ? 'Using default cookie. Click "Unlock to edit" if validation fails.'
                  : 'Get this from your browser\'s Developer Tools → Application → Cookies'
                }
              </p>
            </div>

            {/* Membership IDs Input */}
            <div>
              <label htmlFor="membershipIds" className="block text-xs sm:text-sm font-medium text-black mb-2">
                Membership IDs (one per line, or comma/space separated)
              </label>
              <textarea
                id="membershipIds"
                value={membershipIds}
                onChange={(e) => setMembershipIds(e.target.value)}
                placeholder="99634594&#10;12345678&#10;98765432"
                rows={8}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-black focus:outline-none font-mono text-xs sm:text-sm bg-white text-black placeholder-gray-400"
              />
              <p className="mt-2 text-xs sm:text-sm text-black opacity-60">
                Enter IEEE member numbers (8-9 digits) or email addresses, one per line
              </p>
            </div>

            {/* Progress */}
            {loading && (
              <div className="bg-black border-2 border-black text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg">
                <div className="flex items-center justify-between mb-2 text-xs sm:text-sm">
                  <span>Processing...</span>
                  <span>
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-white rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleValidate}
              disabled={loading}
              className="w-full bg-black text-white py-3 sm:py-3.5 px-6 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border-2 border-black touch-manipulation"
            >
              {loading ? 'Validating...' : 'Validate Memberships'}
            </button>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-6 sm:mt-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3 sm:gap-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-black">
                    Results ({results.length} members)
                  </h2>
                  <button
                    onClick={handleDownload}
                    className="bg-black text-white py-2.5 sm:py-2 px-4 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all duration-200 border-2 border-black touch-manipulation w-full sm:w-auto"
                  >
                    Download CSV
                  </button>
                </div>

                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden border-2 border-black rounded-lg">
                      <table className="min-w-full divide-y divide-black">
                        <thead className="bg-black text-white">
                          <tr>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider border-r border-white">
                              IEEE #
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider border-r border-white">
                              Name
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider border-r border-white">
                              Status
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider border-r border-white hidden sm:table-cell">
                              Grade
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider border-r border-white hidden md:table-cell">
                              Standards
                            </th>
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                              Societies
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-black">
                          {results.map((result, idx) => (
                            <tr key={idx} className={result.error ? 'bg-black text-white' : ''}>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-mono border-r border-black whitespace-nowrap">{result.ieee_number}</td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-black">
                                {result.name_initials || '-'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-black">
                                {result.membership_status ? (
                                  <span
                                    className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap ${
                                      result.membership_status === 'Active'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-red-600 text-white'
                                    }`}
                                  >
                                    {result.membership_status === 'Active' ? 'Active' : 'Not Active'}
                                  </span>
                                ) : (
                                  <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-red-600 text-white whitespace-nowrap">
                                    Not Active
                                  </span>
                                )}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-black hidden sm:table-cell">
                                {result.member_grade || '-'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm border-r border-black hidden md:table-cell">
                                {result.standards_association_member || '-'}
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                                {result.error ? (
                                  <span className="text-white text-[10px] sm:text-xs">{result.error}</span>
                                ) : (
                                  <div className="max-w-xs">
                                    {result.society_memberships ? (
                                      <div className="text-[10px] sm:text-xs">
                                        {result.society_memberships.split(', ').map((soc, i) => (
                                          <div key={i} className="mb-0.5 sm:mb-1">
                                            • {soc}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      '-'
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
