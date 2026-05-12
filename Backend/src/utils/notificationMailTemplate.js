const getNotificationTemplate = (ownerName, driverName, parkingName, startTime, endTime, spotId, status) => {
  const formattedStartTime = new Date(startTime).toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const formattedEndTime = new Date(endTime).toLocaleString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const isAccepted = status === 'acceptée' || status === 'accepted';
  const headerColor = isAccepted ? '#4338CA' : '#F59E0B';
  const headerBgColor = isAccepted ? '#4338CA' : '#F59E0B';
  const headerIcon = isAccepted ? '✅' : '⏳';
  const headerText = isAccepted ? 'Reservation Accepted!' : 'New Reservation Request';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${headerBgColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .info-box { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${headerColor}; }
        .detail-item { display: flex; align-items: center; margin: 10px 0; }
        .icon { margin-right: 10px; font-size: 18px; color: ${headerColor}; }
        .divider { height: 1px; background: #e2e8f0; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 14px; }
        .button { background: ${headerColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
        .driver-section { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">${headerIcon} ${headerText}</h1>
        </div>
        <div class="content">
          <h2>Hello ${ownerName},</h2>
          <p>${isAccepted ? 'Great news! A new reservation has been confirmed for your parking.' : 'You have received a new reservation request for your parking.'}</p>
          
          <div class="driver-section">
            <strong>Driver Information:</strong>
            <p style="margin: 10px 0 0 0;">Name: <strong>${driverName}</strong></p>
          </div>

          <div class="info-box">
            <h3 style="color: ${headerColor}; margin-top: 0;">📝 Reservation Details</h3>
            <div class="detail-item">
              <span class="icon">🅿️</span>
              <span>Parking: <strong>${parkingName}</strong></span>
            </div>
            <div class="detail-item">
              <span class="icon">🎯</span>
              <span>Spot: <strong>${spotId}</strong></span>
            </div>
            <div class="detail-item">
              <span class="icon">🕒</span>
              <span>Start: <strong>${formattedStartTime}</strong></span>
            </div>
            <div class="detail-item">
              <span class="icon">🕕</span>
              <span>End: <strong>${formattedEndTime}</strong></span>
            </div>
          </div>

          ${!isAccepted ? `
          <div style="text-align: center; margin: 20px 0;">
            <p><strong>Action Required:</strong></p>
            <p>Please log in to your dashboard to approve or reject this reservation.</p>
            <a href="${process.env.FRONTEND_URL || 'https://parkez.com'}/dashboard" class="button">
              Review Reservation
            </a>
          </div>
          ` : ''}

          <div class="divider"></div>

          <div class="footer">
            <p>Thank you for using parkEz!</p>
            <p style="color: #94a3b8;">The parkEz Team 🚀</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { getNotificationTemplate };
