'use client';

import { useState } from 'react';

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
  const defaultCookie = 'eyJ6aXAiOiJERUYiLCJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2Iiwia2lkIjoiQk9Gbm5FbXdsUVUwVi1sRjRXcU1uWUxBZV8wIiwicGkuc3JpIjoiZEpuLVBBT3NXX1h5RTBYWldWb3hTZVRTeEd3LlRrbyJ9..A2Q1BqoArW_ZX2g_SJJsUw.oxtocDWwLUdJ-8KELqIkKmbUoE7Y3Xnx7osmBYi0d4eawJWxTeKrG9Yxu054fxgBtoDtk1NZGP7b0_AZYddKoLOdzTrE559tYo1tCDsm5NEa42hebMDR09Hj_d1peY_9sljmpJBWO_JYqVvZqMBPGNK3vbLeeC9foVxCodQ_2EuLyzM9CHnNkhJfp754r4KoREWdSUWeF2guPwYLN-AOhzoM9RVSvdW6nYGcfzE0whYuMid4CgO7gJjB0MASWIxFfJsYgLfd54Cqj_zGhY3yO8JMIDI8EC7IGjBLfkbY91qiuMrpIdW4UXGOcsSW3MzNAAdPKnVDkd6yEjHTNao7cuvhZnGOY6NOIBEUIhj5kL91pDcH33xEEoxZGIqWAZtKTrIn4BI7348lRQ42lDHPbL1cimNciVNIAXsjjFwuBDyNgl6N0UoI0e9kVm_Xr-2iFPPd_T_g67lR6jGZTFKhnM0ssX6ClCmqoZDYqCgnau_yIinHTrtDMNOl6yNeY7OIvAEPvbDknXq7EhuBp0OwgIbWsS5fhjwIXbPz_J-csx8oSOBWkTb4HYKREbCSdY2CdniykGLy2j5zQTJqW15dNDiLQJdqK3Z-CYQnSD2jE9RPhk8coW8nSvUPb6QVRG4Bd1L2-S7PcOPs69ppNd6z0g.at9ssPAtGl4zyygT-c6b6g';
  
  const [cookie, setCookie] = useState(defaultCookie);
  const [membershipIds, setMembershipIds] = useState('');
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [cookieLocked, setCookieLocked] = useState(true);

  const handleValidate = async () => {
    if (!cookie.trim()) {
      setError('Please enter your authentication cookie');
      return;
    }

    if (!membershipIds.trim()) {
      setError('Please enter at least one membership ID');
      return;
    }

    // Parse membership IDs (split by newline, comma, or space)
    const ids = membershipIds
      .split(/[\n,\s]+/)
      .map(id => id.trim())
      .filter(id => id.length > 0);

    if (ids.length === 0) {
      setError('Please enter at least one valid membership ID');
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
          const errorData = await response.json();
          throw new Error(errorData.error || 'Validation failed');
        }

      const data = await response.json();
      
      // Check if any result has a session expired error
      const hasSessionError = data.results.some((r: ValidationResult) => 
        r.error && r.error.includes('Session expired')
      );
      
      if (hasSessionError) {
        setCookieLocked(false); // Unlock cookie input on session error
        setError('Session expired. Please update your cookie and try again.');
        break;
      }
      
      allResults.push(...data.results);
      setResults([...allResults]);
      setProgress({ current: allResults.length, total: ids.length });

      if (!data.hasMore) {
        break;
      }

      batchStart = data.batchEnd;
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

      setProgress({ current: allResults.length, total: ids.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      // Unlock cookie input on any error
      if (errorMessage.includes('Session') || errorMessage.includes('Cookie') || errorMessage.includes('401') || errorMessage.includes('403')) {
        setCookieLocked(false);
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

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="w-full border-b-2 border-white bg-black py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto flex justify-end items-center">
          <div className="flex items-center gap-3">
            <p className="text-white opacity-70 text-sm font-medium">
              Crafted by Stark (Harsh)
            </p>
            <a
              href="https://github.com/StarkAg"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity text-white"
              aria-label="GitHub"
            >
              <svg
                className="w-6 h-6"
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
              <span className="text-sm font-medium">GitHub</span>
            </a>
          </div>
        </div>
      </header>
      
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-2xl p-8 border border-gray-200">
          <h1 className="text-4xl font-bold text-black mb-2">
            IEEE Membership Validator
          </h1>
          <p className="text-black mb-8 opacity-70">
            Bulk validate IEEE membership numbers and extract membership details
          </p>

          <div className="space-y-6">
            {/* Cookie Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="cookie" className="block text-sm font-medium text-black">
                  Authentication Cookie (PA.Global_Websession)
                </label>
                {cookieLocked && (
                  <button
                    type="button"
                    onClick={() => setCookieLocked(false)}
                    className="text-xs text-black opacity-60 hover:opacity-100 underline"
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
                className={`w-full px-4 py-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-black focus:outline-none bg-white text-black placeholder-gray-400 ${
                  cookieLocked ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              />
              <p className="mt-2 text-sm text-black opacity-60">
                {cookieLocked 
                  ? 'Using default cookie. Click "Unlock to edit" if validation fails.'
                  : 'Get this from your browser\'s Developer Tools → Application → Cookies'
                }
              </p>
            </div>

            {/* Membership IDs Input */}
            <div>
              <label htmlFor="membershipIds" className="block text-sm font-medium text-black mb-2">
                Membership IDs (one per line, or comma/space separated)
              </label>
              <textarea
                id="membershipIds"
                value={membershipIds}
                onChange={(e) => setMembershipIds(e.target.value)}
                placeholder="99634594&#10;12345678&#10;98765432"
                rows={10}
                className="w-full px-4 py-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-black focus:outline-none font-mono text-sm bg-white text-black placeholder-gray-400"
              />
              <p className="mt-2 text-sm text-black opacity-60">
                Enter IEEE member numbers (8-9 digits) or email addresses, one per line
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-black border-2 border-black text-white px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Progress */}
            {loading && (
              <div className="bg-black border-2 border-black text-white px-4 py-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
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
              className="w-full bg-black text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border-2 border-black"
            >
              {loading ? 'Validating...' : 'Validate Memberships'}
            </button>

            {/* Results */}
            {results.length > 0 && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-black">
                    Results ({results.length} members)
                  </h2>
                  <button
                    onClick={handleDownload}
                    className="bg-black text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 transition-all duration-200 border-2 border-black"
                  >
                    Download CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-black border-2 border-black">
                    <thead className="bg-black text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border-r border-white">
                          IEEE Number
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border-r border-white">
                          Name Initials
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border-r border-white">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border-r border-white">
                          Grade
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider border-r border-white">
                          Standards
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Societies
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-black">
                      {results.map((result, idx) => (
                        <tr key={idx} className={result.error ? 'bg-black text-white' : ''}>
                          <td className="px-4 py-3 text-sm font-mono border-r border-black">{result.ieee_number}</td>
                          <td className="px-4 py-3 text-sm border-r border-black">
                            {result.name_initials || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-black">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                result.membership_status === 'Active'
                                  ? 'bg-black text-white'
                                  : 'bg-white text-black border border-black'
                              }`}
                            >
                              {result.membership_status || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-black">
                            {result.member_grade || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm border-r border-black">
                            {result.standards_association_member || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {result.error ? (
                              <span className="text-white">{result.error}</span>
                            ) : (
                              <div className="max-w-xs">
                                {result.society_memberships ? (
                                  <div className="text-xs">
                                    {result.society_memberships.split(', ').map((soc, i) => (
                                      <div key={i} className="mb-1">
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
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
