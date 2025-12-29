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
  const [cookie, setCookie] = useState('');
  const [membershipIds, setMembershipIds] = useState('');
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

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
      setError(err instanceof Error ? err.message : 'An error occurred');
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
    <div className="min-h-screen bg-black py-12 px-4 sm:px-6 lg:px-8">
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
              <label htmlFor="cookie" className="block text-sm font-medium text-black mb-2">
                Authentication Cookie (PA.Global_Websession)
              </label>
              <input
                type="password"
                id="cookie"
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="Paste your PA.Global_Websession cookie here"
                className="w-full px-4 py-3 border-2 border-black rounded-lg focus:ring-2 focus:ring-black focus:outline-none bg-white text-black placeholder-gray-400"
              />
              <p className="mt-2 text-sm text-black opacity-60">
                Get this from your browser's Developer Tools → Application → Cookies
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
        
        {/* Footer with subtle credit */}
        <div className="mt-8 text-center">
          <p className="text-white opacity-40 text-xs font-light">
            Crafted by Stark (Harsh)
          </p>
        </div>
      </div>
    </div>
  );
}
