/**
 * Zero-dependency client-side EXIF GPS reader for photo files.
 * Extracts GPSLatitude & GPSLongitude from phone photos (iPhone / Android JPEG).
 */

export interface ExifGpsCoords {
  latitude: number;
  longitude: number;
}

export async function extractExifGps(fileOrBuffer: File | Blob | ArrayBuffer): Promise<ExifGpsCoords | null> {
  try {
    let buffer: ArrayBuffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      buffer = fileOrBuffer;
    } else {
      buffer = await fileOrBuffer.arrayBuffer();
    }

    const dataView = new DataView(buffer);

    // Verify JPEG SOI marker (0xFFD8)
    if (dataView.byteLength < 4 || dataView.getUint16(0, false) !== 0xFFD8) {
      return null;
    }

    let offset = 2;
    const length = dataView.byteLength;

    while (offset < length - 4) {
      const marker = dataView.getUint16(offset, false);
      offset += 2;

      // APP1 Marker: 0xFFE1 (EXIF data)
      if (marker === 0xFFE1) {
        const app1Length = dataView.getUint16(offset, false);
        const exifHeaderOffset = offset + 2;

        // Check for "Exif\0\0" (0x457869660000)
        if (
          dataView.getUint32(exifHeaderOffset, false) === 0x45786966 &&
          dataView.getUint16(exifHeaderOffset + 4, false) === 0x0000
        ) {
          const tiffStart = exifHeaderOffset + 6;
          return parseTiffForGps(dataView, tiffStart);
        }
        offset += app1Length;
      } else if ((marker & 0xFF00) === 0xFF00) {
        // Skip other markers
        if (marker === 0xFFDA || marker === 0xFFD9) break; // SOS or EOI
        const sectionLength = dataView.getUint16(offset, false);
        offset += sectionLength;
      } else {
        break;
      }
    }
  } catch (err) {
    console.warn('EXIF GPS parse notice:', err);
  }
  return null;
}

function parseTiffForGps(view: DataView, tiffStart: number): ExifGpsCoords | null {
  try {
    // Endianness: 0x4949 ('II' Little Endian) or 0x4D4D ('MM' Big Endian)
    const endianness = view.getUint16(tiffStart, false);
    const littleEndian = endianness === 0x4949;

    // Verify Tag 0x002A (42)
    if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002A) {
      return null;
    }

    const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
    if (ifd0Offset < 8) return null;

    let dirOffset = tiffStart + ifd0Offset;
    if (dirOffset >= view.byteLength - 2) return null;

    const numEntries = view.getUint16(dirOffset, littleEndian);
    dirOffset += 2;

    let gpsSubIfdOffset: number | null = null;

    for (let i = 0; i < numEntries; i++) {
      const tag = view.getUint16(dirOffset, littleEndian);
      if (tag === 0x8825) {
        // GPS IFD Pointer
        gpsSubIfdOffset = view.getUint32(dirOffset + 8, littleEndian);
        break;
      }
      dirOffset += 12;
    }

    if (!gpsSubIfdOffset) return null;

    const gpsOffset = tiffStart + gpsSubIfdOffset;
    if (gpsOffset >= view.byteLength - 2) return null;

    const numGpsEntries = view.getUint16(gpsOffset, littleEndian);
    let currentGpsEntry = gpsOffset + 2;

    let latRef: string | null = null;
    let latValues: number[] | null = null;
    let lonRef: string | null = null;
    let lonValues: number[] | null = null;

    for (let i = 0; i < numGpsEntries; i++) {
      const tag = view.getUint16(currentGpsEntry, littleEndian);
      const valOffset = currentGpsEntry + 8;

      if (tag === 0x0001) {
        // GPSLatitudeRef ('N' or 'S')
        latRef = String.fromCharCode(view.getUint8(valOffset));
      } else if (tag === 0x0002) {
        // GPSLatitude (3 RATIONALs)
        const offsetToRationals = tiffStart + view.getUint32(valOffset, littleEndian);
        latValues = readRationals(view, offsetToRationals, 3, littleEndian);
      } else if (tag === 0x0003) {
        // GPSLongitudeRef ('E' or 'W')
        lonRef = String.fromCharCode(view.getUint8(valOffset));
      } else if (tag === 0x0004) {
        // GPSLongitude (3 RATIONALs)
        const offsetToRationals = tiffStart + view.getUint32(valOffset, littleEndian);
        lonValues = readRationals(view, offsetToRationals, 3, littleEndian);
      }

      currentGpsEntry += 12;
    }

    if (latValues && lonValues) {
      let lat = latValues[0] + latValues[1] / 60 + latValues[2] / 3600;
      let lon = lonValues[0] + lonValues[1] / 60 + lonValues[2] / 3600;

      if (latRef === 'S') lat = -lat;
      if (lonRef === 'W') lon = -lon;

      if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { latitude: lat, longitude: lon };
      }
    }
  } catch (err) {
    console.warn('Error reading GPS IFD:', err);
  }
  return null;
}

function readRationals(view: DataView, offset: number, count: number, littleEndian: boolean): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const num = view.getUint32(offset + i * 8, littleEndian);
    const den = view.getUint32(offset + i * 8 + 4, littleEndian);
    result.push(den === 0 ? 0 : num / den);
  }
  return result;
}
