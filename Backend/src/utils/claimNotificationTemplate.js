const getClaimSubmittedTemplate = (userName, claimDetails) => {
    const { plateNumber, parkingName, location, description, claimId, imageUrl } = claimDetails;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claim Submitted Successfully</title>
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            color: #667eea;
            width: 150px;
            flex-shrink: 0;
        }
        .detail-value {
            color: #333;
            flex-grow: 1;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 16px;
            background-color: #ffc107;
            color: #000;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
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
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚗 Claim Submitted Successfully</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello <strong>${userName}</strong>,
            </div>
            
            <div class="message">
                Your parking claim has been successfully submitted and is now being reviewed. 
                We will notify you once the parking owner processes your claim.
            </div>
            
            <div class="claim-details">
                <h3 style="margin-top: 0; color: #333;">📋 Claim Details</h3>
                
                <div class="detail-row">
                    <div class="detail-label">Claim ID:</div>
                    <div class="detail-value"><strong>${claimId}</strong></div>
                </div>
                
                ${plateNumber ? `
                <div class="detail-row">
                    <div class="detail-label">Vehicle Plate:</div>
                    <div class="detail-value"><strong>${plateNumber}</strong></div>
                </div>
                ` : ''}
                
                ${parkingName ? `
                <div class="detail-row">
                    <div class="detail-label">Parking:</div>
                    <div class="detail-value">${parkingName}</div>
                </div>
                ` : ''}
                
                ${location ? `
                <div class="detail-row">
                    <div class="detail-label">Location:</div>
                    <div class="detail-value">${location}</div>
                </div>
                ` : ''}
                
                <div class="detail-row">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value"><span class="status-badge">⏳ Pending Review</span></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Description:</div>
                    <div class="detail-value">${description}</div>
                </div>
            </div>
            
            ${imageUrl ? `
            <div style="text-align: center;">
                <p style="color: #666; margin-bottom: 10px;"><strong>Vehicle Evidence Photo:</strong></p>
                <img src="${imageUrl}" alt="Vehicle Evidence" class="vehicle-image">
            </div>
            ` : ''}
            
            <div class="info-box">
                <p>
                    <strong>📱 Track Your Claim:</strong> You can track the status of your claim 
                    in the "My Claims" section of your profile. We'll send you an email notification 
                    when the parking owner reviews your claim.
                </p>
            </div>
            
            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-claims" class="button">
                    View My Claims
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

const getClaimStatusUpdateTemplate = (userName, claimDetails, newStatus) => {
    const { plateNumber, parkingName, claimId, statusMessage } = claimDetails;
    
    const statusConfig = {
        'Approved': {
            color: '#28a745',
            icon: '✅',
            title: 'Claim Approved',
            message: 'Great news! Your claim has been approved by the parking owner.'
        },
        'Rejected': {
            color: '#dc3545',
            icon: '❌',
            title: 'Claim Update',
            message: 'Your claim has been reviewed. Please see the details below.'
        },
        'Under Review': {
            color: '#ffc107',
            icon: '🔍',
            title: 'Claim Under Review',
            message: 'Your claim is currently being reviewed by the parking owner.'
        }
    };
    
    const config = statusConfig[newStatus] || statusConfig['Under Review'];
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claim Status Update</title>
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
            background-color: ${config.color};
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
            color: #667eea;
            width: 150px;
            flex-shrink: 0;
        }
        .detail-value {
            color: #333;
            flex-grow: 1;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 16px;
            background-color: ${config.color};
            color: white;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 25px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
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
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${config.icon} ${config.title}</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hello <strong>${userName}</strong>,
            </div>
            
            <div class="message">
                ${config.message}
            </div>
            
            <div class="claim-details">
                <h3 style="margin-top: 0; color: #333;">📋 Claim Information</h3>
                
                <div class="detail-row">
                    <div class="detail-label">Claim ID:</div>
                    <div class="detail-value"><strong>${claimId}</strong></div>
                </div>
                
                ${plateNumber ? `
                <div class="detail-row">
                    <div class="detail-label">Vehicle Plate:</div>
                    <div class="detail-value"><strong>${plateNumber}</strong></div>
                </div>
                ` : ''}
                
                ${parkingName ? `
                <div class="detail-row">
                    <div class="detail-label">Parking:</div>
                    <div class="detail-value">${parkingName}</div>
                </div>
                ` : ''}
                
                <div class="detail-row">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value"><span class="status-badge">${newStatus}</span></div>
                </div>
                
                ${statusMessage ? `
                <div class="detail-row">
                    <div class="detail-label">Message:</div>
                    <div class="detail-value">${statusMessage}</div>
                </div>
                ` : ''}
            </div>
            
            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-claims" class="button">
                    View Claim Details
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>🅿️ PARKEZ</strong></p>
            <p>© 2025 ParkEz. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = {
    getClaimSubmittedTemplate,
    getClaimStatusUpdateTemplate
};
