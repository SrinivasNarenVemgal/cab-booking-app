const PDFDocument = require('pdfkit');

// Generate PDF receipt as a Buffer
function generateReceiptPDF(ride, payment, user) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const buffers = [];

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const amber = '#f59e0b';
    const dark = '#1f2937';
    const gray = '#6b7280';

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill(amber);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text('🚖 CabApp', 40, 25);
    doc.fillColor('white').fontSize(10).font('Helvetica').text('RIDE RECEIPT', 40, 52);

    // Receipt info
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold');
    doc.text(`Receipt #${ride.id.slice(0, 8).toUpperCase()}`, 40, 100);
    doc.fillColor(gray).font('Helvetica').fontSize(9);
    doc.text(`Date: ${new Date(ride.completed_at || ride.created_at).toLocaleString('en-IN')}`, 40, 115);

    // Divider
    doc.moveTo(40, 135).lineTo(doc.page.width - 40, 135).strokeColor('#e5e7eb').stroke();

    // Passenger Info
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('PASSENGER', 40, 145);
    doc.fillColor(gray).font('Helvetica').fontSize(9).text(user.name, 40, 160);
    doc.text(user.email, 40, 172);

    // Ride Details
    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('RIDE DETAILS', 40, 195);

    const details = [
      ['From', ride.pickup_address],
      ['To', ride.dropoff_address],
      ['Vehicle', ride.vehicle_type?.toUpperCase() || 'SEDAN'],
      ['Distance', `${ride.distance_km} km`],
      ['Duration', `${ride.duration_minutes} mins`],
    ];

    let y = 210;
    details.forEach(([label, value]) => {
      doc.fillColor(gray).font('Helvetica').fontSize(9).text(label, 40, y);
      doc.fillColor(dark).text(value, 180, y);
      y += 16;
    });

    // Payment breakdown
    doc.moveTo(40, y + 5).lineTo(doc.page.width - 40, y + 5).strokeColor('#e5e7eb').stroke();
    y += 15;

    doc.fillColor(dark).fontSize(10).font('Helvetica-Bold').text('PAYMENT', 40, y);
    y += 15;

    const paymentRows = [
      ['Base Fare', '₹40.00'],
      ['Distance Charge', `₹${(ride.distance_km * 12).toFixed(2)}`],
      ['Time Charge', `₹${(ride.duration_minutes * 1.5).toFixed(2)}`],
    ];

    paymentRows.forEach(([label, value]) => {
      doc.fillColor(gray).font('Helvetica').fontSize(9).text(label, 40, y);
      doc.text(value, 250, y, { align: 'right', width: doc.page.width - 290 });
      y += 15;
    });

    // Total
    doc.rect(35, y, doc.page.width - 70, 28).fill('#fef3c7');
    doc.fillColor(amber).font('Helvetica-Bold').fontSize(12).text('TOTAL PAID', 45, y + 8);
    doc.fillColor(amber).text(`₹${payment.amount}`, 45, y + 8, {
      align: 'right',
      width: doc.page.width - 90,
    });
    y += 40;

    // Payment method
    doc.fillColor(gray).font('Helvetica').fontSize(8);
    doc.text(`Payment Method: ${payment.method?.toUpperCase() || 'CARD'}`, 40, y);
    doc.text(`Status: ${payment.status?.toUpperCase()}`, 40, y + 12);

    // Footer
    doc.moveTo(40, doc.page.height - 50).lineTo(doc.page.width - 40, doc.page.height - 50).strokeColor('#e5e7eb').stroke();
    doc.fillColor(gray).fontSize(8).text('Thank you for riding with CabApp! 🚖', 40, doc.page.height - 38, {
      align: 'center',
      width: doc.page.width - 80,
    });

    doc.end();
  });
}

module.exports = { generateReceiptPDF };
