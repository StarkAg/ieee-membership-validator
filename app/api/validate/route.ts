import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ValidationResult {
  ieee_number: string;
  name_initials: string | null;
  membership_status: string | null;
  member_grade: string | null;
  standards_association_member: string | null;
  society_memberships: string | null;
  error: string | null;
}

class IEEEMembershipValidator {
  private baseUrl: string;
  private cookie: string;
  public delay: number;

  constructor(cookie: string, delay: number = 700) {
    this.baseUrl = 'https://services24.ieee.org/membership-validator.html';
    this.cookie = cookie;
    this.delay = delay; // milliseconds - configurable delay
  }

  private checkSessionExpiry($: cheerio.CheerioAPI): boolean {
    const html = $.html();
    return !html.includes('Membership validation status');
  }

  private extractFieldValue($: cheerio.CheerioAPI, labelText: string): string | null {
    // Find strong tag containing the label text
    let foundElem: any = null;
    
    // Search through all strong tags
    $('strong').each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text();
      if (text && text.includes(labelText)) {
        foundElem = elem;
        return false; // break
      }
    });
    
    if (!foundElem) return null;
    
    const labelElement = $(foundElem);
    if (labelElement.length === 0) return null;

    // Get the parent element (usually the container of <strong>)
    let parent = labelElement;
    if (!labelElement.is('strong')) {
      parent = labelElement.parent();
    }
    if (parent.length === 0) return null;

    // Check for sibling <span> elements (the value is usually in a sibling <span>)
    const nextSibling = parent.next();
    if (nextSibling.length > 0) {
      if (nextSibling.is('span')) {
        let value = nextSibling.text().trim();
        
        // For name initials, collect all consecutive spans (e.g., "K" and "G")
        if (labelText === 'First and last name initials') {
          const spans: string[] = [value];
          let current = nextSibling;
          let nextSpan = current.next();
          while (nextSpan.length > 0 && nextSpan.is('span')) {
            const spanText = nextSpan.text().trim();
            if (spanText) spans.push(spanText);
            current = nextSpan;
            nextSpan = current.next();
          }
          if (spans.length > 1) {
            return spans.join('. ') + '.';
          }
          // If only one span, return it with a period
          if (spans.length === 1 && value) {
            return value + '.';
          }
        }
        
        if (value) return value;
      } else {
        // If it's not a span, try getting text from the sibling
        const value = nextSibling.text().trim();
        if (value && !value.includes(labelText)) return value;
      }
    }

    // Try to extract from parent text (after colon) as fallback
    const fullText = parent.text();
    const colonIndex = fullText.indexOf(':');
    if (colonIndex !== -1) {
      const value = fullText.substring(colonIndex + 1).trim();
      if (value) return value;
    }

    // Try all next siblings
    let sibling = parent.next();
    while (sibling.length > 0) {
      const text = sibling.text().trim();
      if (text && !text.includes(labelText) && text.length > 0) {
        return text;
      }
      sibling = sibling.next();
    }

    return null;
  }

  private extractNameInitials($: cheerio.CheerioAPI): string | null {
    return this.extractFieldValue($, 'First and last name initials');
  }

  private extractMembershipStatus($: cheerio.CheerioAPI): string | null {
    return this.extractFieldValue($, 'Membership status');
  }

  private extractMemberGrade($: cheerio.CheerioAPI): string | null {
    return this.extractFieldValue($, 'IEEE member grade');
  }

  private extractStandardsAssociation($: cheerio.CheerioAPI): string | null {
    return this.extractFieldValue($, 'Standards Association Member');
  }

  private extractSocietyMemberships($: cheerio.CheerioAPI): string | null {
    // Find strong tag containing "Society membership"
    let foundElem: any = null;
    $('strong').each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text();
      if (text && text.includes('Society membership')) {
        foundElem = elem;
        return false; // break
      }
    });
    
    if (!foundElem) return null;

    const labelElement = $(foundElem);
    const parent = labelElement.parent();
    if (parent.length === 0) return null;

    const societies: string[] = [];

    // First, try to find a list (ul/ol) after the label
    const listElem = parent.next('ul, ol');
    if (listElem.length > 0) {
      listElem.find('li').each((_, li) => {
        const text = $(li).text().trim();
        if (text && text.includes('IEEE')) {
          societies.push(text);
        }
      });
      if (societies.length > 0) {
        return societies.join(', ');
      }
    }

    // If no immediate list, look for next siblings
    parent.nextAll('ul, ol').first().find('li').each((_, li) => {
      const text = $(li).text().trim();
      if (text && text.includes('IEEE')) {
        if (!societies.includes(text)) {
          societies.push(text);
        }
      }
    });

    // Check parent's next siblings
    parent.nextAll('div, span, p, ul, ol').each((_, elem) => {
      const $elem = $(elem);
      if ($elem.is('ul, ol')) {
        $elem.find('li').each((_, li) => {
          const text = $(li).text().trim();
          if (text && text.includes('IEEE') && !societies.includes(text)) {
            societies.push(text);
          }
        });
      } else {
        const text = $elem.text().trim();
        if (text && text.includes('IEEE') && text.includes('Society') && !societies.includes(text)) {
          societies.push(text);
        }
      }
    });

    // Also check elements that come after the parent in the document
    let current = parent.next();
    while (current.length > 0) {
      if (current.is('ul, ol')) {
        current.find('li').each((_, li) => {
          const text = $(li).text().trim();
          if (text && text.includes('IEEE') && text.includes('Society') && text.includes('Membership')) {
            if (!societies.includes(text)) {
              societies.push(text);
            }
          }
        });
      }
      current = current.next();
    }

    return societies.length > 0 ? societies.join(', ') : null;
  }

  async validateMember(memberNumber: string): Promise<ValidationResult> {
    const formData = new URLSearchParams();
    formData.append('customerId', memberNumber.trim());

    try {
      const response = await axios.post(this.baseUrl, formData.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://services24.ieee.org/membership-validator.html',
          Origin: 'https://services24.ieee.org',
          Cookie: `PA.Global_Websession=${this.cookie}`,
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);

      if (this.checkSessionExpiry($)) {
        return {
          ieee_number: memberNumber,
          name_initials: null,
          membership_status: null,
          member_grade: null,
          standards_association_member: null,
          society_memberships: null,
          error: 'Session expired: Membership validation status section not found',
        };
      }

      return {
        ieee_number: memberNumber,
        name_initials: this.extractNameInitials($),
        membership_status: this.extractMembershipStatus($),
        member_grade: this.extractMemberGrade($),
        standards_association_member: this.extractStandardsAssociation($),
        society_memberships: this.extractSocietyMemberships($),
        error: null,
      };
    } catch (error: any) {
      // Check for 404 Not Found
      if (error.response && error.response.status === 404) {
        return {
          ieee_number: memberNumber,
          name_initials: null,
          membership_status: null,
          member_grade: null,
          standards_association_member: null,
          society_memberships: null,
          error: '404 Not Found - Please click "Fire Up Validator API" before validating',
        };
      }
      
      // Check for 401 Unauthorized (expired cookie)
      if (error.response && error.response.status === 401) {
        return {
          ieee_number: memberNumber,
          name_initials: null,
          membership_status: null,
          member_grade: null,
          standards_association_member: null,
          society_memberships: null,
          error: 'Session expired: 401 Unauthorized - Cookie is invalid or expired',
        };
      }
      
      // Check for 403 Forbidden (access denied)
      if (error.response && error.response.status === 403) {
        return {
          ieee_number: memberNumber,
          name_initials: null,
          membership_status: null,
          member_grade: null,
          standards_association_member: null,
          society_memberships: null,
          error: 'Access denied: 403 Forbidden - Cookie may be invalid',
        };
      }
      
      return {
        ieee_number: memberNumber,
        name_initials: null,
        membership_status: null,
        member_grade: null,
        standards_association_member: null,
        society_memberships: null,
        error: `Error: ${error.message || 'Unknown error'}`,
      };
    }
  }

  async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cookie, membershipIds, batchStart = 0, batchSize = 10, requestDelay = 700 } = body;

    if (!cookie) {
      return NextResponse.json({ error: 'Cookie is required' }, { status: 400 });
    }

    if (!membershipIds || !Array.isArray(membershipIds) || membershipIds.length === 0) {
      return NextResponse.json({ error: 'Membership IDs are required' }, { status: 400 });
    }

    // Validate and clamp requestDelay to reasonable bounds
    const delay = Math.max(0, Math.min(5000, parseInt(String(requestDelay)) || 700));

    const validator = new IEEEMembershipValidator(cookie, delay);
    const results: ValidationResult[] = [];

    // Process in batches to avoid timeout
    const startIdx = batchStart;
    const endIdx = Math.min(startIdx + batchSize, membershipIds.length);
    const batch = membershipIds.slice(startIdx, endIdx);

    let hasSessionError = false;
    let refreshTriggered = false;

    for (let idx = 0; idx < batch.length; idx++) {
      const memberId = batch[idx];
      const result = await validator.validateMember(memberId);
      results.push(result);

      // Check for 401, 403, or session expired errors
      if (result.error && (
        result.error.includes('401') || 
        result.error.includes('403') || 
        result.error.includes('Session expired') ||
        result.error.includes('Access denied')
      )) {
        hasSessionError = true;
        console.log(`🔴 Session error detected for member ${memberId}: ${result.error}`);
      }

      // Add delay between requests (except for the last one)
      if (idx < batch.length - 1) {
        await validator.sleep(validator.delay);
      }
    }

    // If session error detected (401/403), trigger GitHub Actions workflow to refresh cookie
    if (hasSessionError && !refreshTriggered) {
      console.log('🔄 Session error detected. Attempting to trigger cookie refresh workflow...');
      try {
        const githubToken = process.env.GITHUB_TOKEN;
        const githubRepo = process.env.GITHUB_REPO; // Format: "owner/repo"
        const workflowId = 'refresh-cookie.yml';

        if (githubToken && githubRepo) {
          console.log(`📝 Triggering workflow: ${githubRepo}/${workflowId}`);
          const [owner, repo] = githubRepo.split('/');
          if (owner && repo) {
            const refreshResponse = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
              {
                method: 'POST',
                headers: {
                  'Accept': 'application/vnd.github+json',
                  'Authorization': `Bearer ${githubToken}`,
                  'X-GitHub-Api-Version': '2022-11-28',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ref: 'main',
                }),
              }
            );

            if (refreshResponse.ok) {
              refreshTriggered = true;
              console.log('✅ Cookie refresh workflow triggered successfully');
            } else {
              const errorText = await refreshResponse.text();
              console.error('Failed to trigger refresh workflow:', refreshResponse.status, errorText);
            }
          }
        } else {
          const missing = [];
          if (!githubToken) missing.push('GITHUB_TOKEN');
          if (!githubRepo) missing.push('GITHUB_REPO');
          console.warn(`❌ ${missing.join(' and ')} not configured - cannot auto-refresh cookie`);
          console.warn('To fix: Go to Vercel → Settings → Environment Variables and add:', missing.join(', '));
        }
      } catch (error) {
        console.error('Error triggering refresh workflow:', error);
        // Don't fail the request if refresh trigger fails
      }
    }

    return NextResponse.json({ 
      results,
      batchStart: startIdx,
      batchEnd: endIdx,
      total: membershipIds.length,
      hasMore: endIdx < membershipIds.length,
      refreshTriggered: refreshTriggered,
      hasSessionError: hasSessionError
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

