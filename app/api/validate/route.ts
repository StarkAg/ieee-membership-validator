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
  private delay: number;

  constructor(cookie: string) {
    this.baseUrl = 'https://services24.ieee.org/membership-validator.html';
    this.cookie = cookie;
    this.delay = 700; // milliseconds
  }

  private checkSessionExpiry($: cheerio.CheerioAPI): boolean {
    const html = $.html();
    return !html.includes('Membership validation status');
  }

  private extractFieldValue($: cheerio.CheerioAPI, labelText: string): string | null {
    // Find element containing the label text
    let foundElement: any = null;
    $('*').each((_, elem) => {
      const text = $(elem).text();
      if (text && text.includes(labelText)) {
        foundElement = elem;
        return false; // break
      }
    });
    
    if (!foundElement) return null;

    const labelElement = $(foundElement);
    const parent = labelElement.parent();
    if (parent.length === 0) return null;

    // Check for sibling span elements
    const nextSibling = parent.next();
    if (nextSibling.length > 0) {
      if (nextSibling.is('span')) {
        let value = nextSibling.text().trim();
        
        // For name initials, collect all consecutive spans
        if (labelText === 'First and last name initials') {
          const spans: string[] = [value];
          let current = nextSibling;
          while (current.next().is('span')) {
            current = current.next();
            spans.push(current.text().trim());
          }
          if (spans.length > 1) {
            return spans.join('. ') + '.';
          }
        }
        
        if (value) return value;
      } else {
        const value = nextSibling.text().trim();
        if (value && !value.includes(labelText)) return value;
      }
    }

    // Try to extract from parent text (after colon)
    const fullText = parent.text();
    const colonIndex = fullText.indexOf(':');
    if (colonIndex !== -1) {
      const value = fullText.substring(colonIndex + 1).trim();
      if (value) return value;
    }

    // Try next siblings
    let sibling = parent.next();
    while (sibling.length > 0) {
      const text = sibling.text().trim();
      if (text && !text.includes(labelText)) return text;
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
    let foundElement: any = null;
    $('*').each((_, elem) => {
      const text = $(elem).text();
      if (text && text.includes('Society membership')) {
        foundElement = elem;
        return false; // break
      }
    });
    
    if (!foundElement) return null;

    const labelElement = $(foundElement);
    const parent = labelElement.parent();
    if (parent.length === 0) return null;

    const societies: string[] = [];

    // Look for ul/ol lists
    const listElem = parent.nextAll('ul, ol').first();
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

    // Check siblings
    parent.nextAll('div, span, p, ul, ol').each((_, elem) => {
      const $elem = $(elem);
      if ($elem.is('ul, ol')) {
        $elem.find('li').each((_, li) => {
          const text = $(li).text().trim();
          if (text && text.includes('IEEE')) {
            societies.push(text);
          }
        });
      } else {
        const text = $elem.text().trim();
        if (text && text.includes('IEEE') && text.includes('Society')) {
          societies.push(text);
        }
      }
    });

    // Check all following elements
    parent.find('~ *').each((_, elem) => {
      const text = $(elem).text().trim();
      if (
        text &&
        text.includes('IEEE') &&
        text.includes('Society') &&
        text.includes('Membership') &&
        !societies.includes(text)
      ) {
        societies.push(text);
      }
    });

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
    const { cookie, membershipIds } = body;

    if (!cookie) {
      return NextResponse.json({ error: 'Cookie is required' }, { status: 400 });
    }

    if (!membershipIds || !Array.isArray(membershipIds) || membershipIds.length === 0) {
      return NextResponse.json({ error: 'Membership IDs are required' }, { status: 400 });
    }

    const validator = new IEEEMembershipValidator(cookie);
    const results: ValidationResult[] = [];

    for (let idx = 0; idx < membershipIds.length; idx++) {
      const memberId = membershipIds[idx];
      const result = await validator.validateMember(memberId);
      results.push(result);

      // Add delay between requests (except for the last one)
      if (idx < membershipIds.length - 1) {
        await validator.sleep(700);
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

