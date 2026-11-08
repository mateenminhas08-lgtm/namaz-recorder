import { PrayerRecord } from '@namaz-recorder/shared';

export class ReportService {
  /**
   * Generates a high-resolution, minimal soft-green Designed Report Card for WhatsApp.
   * Renders full details: Date, Prayers, Status, Masjid/Home tag, Tracking Method, Exact Time.
   */
  public generateReportCardSvg(dateStr: string, prayers: PrayerRecord[], userName: string): string {
    const width = 800;
    const height = 960;

    let prayerCardsSvg = '';
    const startY = 220;
    const cardHeight = 110;
    const gap = 20;

    const statusColors: Record<string, { bg: string; text: string; label: string }> = {
      PRAYED: { bg: '#E8F5E9', text: '#2E7D32', label: 'Ada ki gayi / Prayed' },
      RECOVERED: { bg: '#E0F2F1', text: '#00796B', label: 'Qaza Recovered' },
      MISSED: { bg: '#FFEBEE', text: '#C62828', label: 'Missed' },
      PENDING: { bg: '#F5F5F5', text: '#616161', label: 'Pending' }
    };

    const trackingLabels: Record<string, string> = {
      GEOFENCE: 'Masjid Location Tracked (Khud-kaar)',
      MOTION: 'Pocket Motion Tracked',
      MANUAL: 'Manual Entry',
      PROMPT_FALLBACK: '1-Tap Prompt'
    };

    prayers.forEach((prayer, idx) => {
      const y = startY + idx * (cardHeight + gap);
      const conf = statusColors[prayer.status] || statusColors.PENDING;
      const tracking = trackingLabels[prayer.trackingMethod] || prayer.trackingMethod;
      const timeStr = prayer.prayedAt 
        ? new Date(prayer.prayedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) 
        : '--:--';
      const loc = prayer.location === 'MASJID' ? 'Masjid' : 'Ghar / Office';

      prayerCardsSvg += `
        <!-- Card ${prayer.prayerName} -->
        <g transform="translate(40, ${y})">
          <rect width="720" height="${cardHeight}" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.5" />
          <rect x="0" y="0" width="8" height="${cardHeight}" rx="4" fill="${conf.text}" />
          
          <!-- Prayer Name -->
          <text x="30" y="45" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="bold" fill="#1B4D3E">${prayer.prayerName}</text>
          
          <!-- Status Pill -->
          <rect x="520" y="24" width="170" height="32" rx="16" fill="${conf.bg}" />
          <text x="605" y="46" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" fill="${conf.text}" text-anchor="middle">${conf.label}</text>
          
          <!-- Details Row -->
          <text x="30" y="82" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" fill="#4A5568">
            <tspan font-weight="600">Jagah:</tspan> ${loc}  |  
            <tspan font-weight="600">Tareeqa:</tspan> ${tracking}  |  
            <tspan font-weight="600">Waqt:</tspan> ${timeStr}
          </text>
        </g>
      `;
    });

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#EAF5EE" />
            <stop offset="100%" stop-color="#D6EBE0" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="${width}" height="${height}" fill="url(#bgGradient)" rx="28" />
        
        <!-- Header -->
        <g transform="translate(40, 50)">
          <!-- App Title -->
          <text x="0" y="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="32" font-weight="800" fill="#144D34">NAMAZ RECORDER</text>
          <text x="0" y="68" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="500" fill="#2E7D32">Apni Masjid ke Waqt ke Mutabiq Smart Namaz Tracker</text>
          
          <!-- Date Badge -->
          <rect x="530" y="10" width="190" height="48" rx="24" fill="#FFFFFF" stroke="#C8E6C9" stroke-width="2" />
          <text x="625" y="41" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="bold" fill="#1B4D3E" text-anchor="middle">${dateStr}</text>
        </g>
        
        <!-- Divider -->
        <line x1="40" y1="180" x2="760" y2="180" stroke="#B8DBC9" stroke-width="2" stroke-dasharray="6,6" />
        
        <!-- Prayer Cards -->
        ${prayerCardsSvg}
        
        <!-- Footer -->
        <g transform="translate(40, 900)">
          <text x="0" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" fill="#2E7D32">User: ${userName}</text>
          <text x="720" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="500" fill="#52796F" text-anchor="end">Auto-Tracked via Masjid Geofence &amp; Motion</text>
        </g>
      </svg>
    `.trim();
  }
}

export const reportService = new ReportService();
