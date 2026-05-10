const getClaimAgainstVehicleTemplate = (ownerName, claimDetails) => {
    const { plateNumber, parkingName, location, description, claimId, imageUrl, claimantName, submittedDate } = claimDetails;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claim Registered Against Your Vehicle</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .content {
            padding: 40px 30px;
        }
        .alert-box {
            background-color: #fff3cd;
            border-left: 4px solid #ff6b6b;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .alert-box h3 {
            margin: 0 0 10px 0;
            color: #856404;
            font-size: 18px;
        }
        .alert-box p {
            margin: 0;
            color: #856404;
            font-size: 14px;
            line-height: 1.6;
        }
        .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            color: #555;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .claim-details {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
        }
        .detail-row {
            display: flex;
            padding: 12px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            font-weight: 600;
            color: #ff6b6b;
            width: 180px;
            flex-shrink: 0;
        }
        .detail-value {
            color: #333;
            flex-grow: 1;
        }
        .plate-badge {
            display: inline-block;
            padding: 8px 20px;
            background-color: #333;
            color: #fff;
            border-radius: 6px;
            font-weight: 700;
            font-size: 18px;
            letter-spacing: 2px;
            font-family: monospace;
        }
        .vehicle-image {
            width: 100%;
            max-width: 500px;
            height: auto;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .info-box {
            background-color: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-box p {
            margin: 0;
            color: #1976D2;
            font-size: 14px;
            line-height: 1.6;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 25px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        .footer-links {
            margin-top: 15px;
        }
        .footer-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            margin: 20px 0;
            text-align: center;
        }
        .warning-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="warning-icon">⚠️</div>
            <h1>Claim Registered Against Your Vehicle</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello <strong>${ownerName}</strong>,
            </div>
            
            <div class="alert-box">
                <h3>🚨 Important Notice</h3>
                <p>
                    A parking claim has been registered against your vehicle. 
                    This claim is currently under review by the parking management.
                </p>
            </div>
            
            <div class="message">
                We are writing to inform you that a claim has been submitted regarding an incident 
                involving your vehicle at one of our parking facilities. Please review the details below.
            </div>
            
            <div class="claim-details">
                <h3 style="margin-top: 0; color: #333;">📋 Claim Details</h3>
                
                <div class="detail-row">
                    <div class="detail-label">Your Vehicle Plate:</div>
                    <div class="detail-value">
                        <span class="plate-badge">${plateNumber}</span>
                    </div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Claim ID:</div>
                    <div class="detail-value"><strong>${claimId}</strong></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Submitted By:</div>
                    <div class="detail-value">${claimantName || 'Another User'}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Date Submitted:</div>
                    <div class="detail-value">${submittedDate}</div>
                </div>
                
                ${parkingName ? `
                <div class="detail-row">
                    <div class="detail-label">Parking Location:</div>
                    <div class="detail-value">${parkingName}</div>
                </div>
                ` : ''}
                
                ${location ? `
                <div class="detail-row">
                    <div class="detail-label">Address:</div>
                    <div class="detail-value">${location}</div>
                </div>
                ` : ''}
                
                <div class="detail-row">
                    <div class="detail-label">Incident Description:</div>
                    <div class="detail-value">${description}</div>
                </div>
            </div>
            
            ${imageUrl ? `
            <div style="text-align: center;">
                <p style="color: #666; margin-bottom: 10px;"><strong>📸 Evidence Photo:</strong></p>
                <img src="${imageUrl}" alt="Incident Evidence" class="vehicle-image">
            </div>
            ` : ''}
            
            <div class="info-box">
                <p>
                    <strong>📞 What Should You Do?</strong><br><br>
                    1. Review the claim details and evidence photo carefully<br>
                    2. If you have any information or concerns about this claim, please contact the parking management<br>
                    3. You may be contacted for additional information regarding this incident<br>
                    4. Keep this email for your records
                </p>
            </div>
            
            <div class="info-box" style="background-color: #fff3cd; border-left-color: #ffc107;">
                <p style="color: #856404;">
                    <strong>⚖️ Important:</strong> This is an automated notification. 
                    The claim is currently being reviewed by the parking owner. 
                    You will be notified of any updates or actions required.
                </p>
            </div>
            
            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/contact-support" class="button">
                    Contact Support
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>🅿️ PARKEZ</strong></p>
            <p>Convenient and Affordable Parking</p>
            <div class="footer-links">
                <a href="#">Help Center</a> | 
                <a href="#">Contact Support</a> | 
                <a href="#">Privacy Policy</a>
            </div>
            <p style="margin-top: 15px; font-size: 12px;">
                © 2025 ParkEz. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = {
    getClaimAgainstVehicleTemplate
};
