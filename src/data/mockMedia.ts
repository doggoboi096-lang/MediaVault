import { MediaItem, SmartCollection, IndexingActivity, SystemHardwareStatus } from '../types';

export const INITIAL_MEDIA: MediaItem[] = [
  {
    id: 'media-01',
    title: 'IMG_2023_Sunrise_Alps.jpg',
    filename: 'IMG_2023_Sunrise_Alps.jpg',
    path: 'D:/Photos/Travel',
    url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=2000&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2023-07-14',
    dateFormatted: 'July 14, 2023',
    exif: {
      camera: 'Sony A7R IV',
      lens: 'FE 16-35mm F2.8 GM',
      aperture: 'f/8.0',
      shutter: '1/125s',
      iso: 100,
      focalLength: '24mm',
      dimensions: '9504 x 6336',
      width: 9504,
      height: 6336,
      size: '24.5 MB',
      sizeBytes: 25690112,
      colorSpace: 'Adobe RGB (1998)',
      dateTaken: '2023-07-14 05:42:19',
      format: 'JPEG (Raw Converted)'
    },
    location: {
      name: 'Matterhorn Base',
      city: 'Zermatt',
      country: 'Switzerland',
      latitude: 45.9763,
      longitude: 7.6586,
      altitude: '2,880m'
    },
    tags: ['landscape', 'switzerland', 'sunrise', 'mountains', 'alps'],
    detectedObjects: [
      { id: 'det-1', label: 'mountain peak', confidence: 0.98, box: { ymin: 30, xmin: 15, ymax: 70, xmax: 85 }, category: 'nature' },
      { id: 'det-2', label: 'lake', confidence: 0.92, box: { ymin: 65, xmin: 32, ymax: 82, xmax: 56 }, category: 'nature' },
      { id: 'det-3', label: 'cloud / sunrise', confidence: 0.94, box: { ymin: 10, xmin: 5, ymax: 45, xmax: 95 }, category: 'nature' }
    ],
    isFavorite: true,
    collection: 'Travel'
  },
  {
    id: 'media-02',
    title: 'VID_2023_SF_GoldenGate_Sunset.mp4',
    filename: 'VID_2023_SF_GoldenGate_Sunset.mp4',
    path: 'D:/GiaDinh/HinhAnh/Videos',
    url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=600&q=80',
    type: 'video',
    date: '2026-08-15',
    dateFormatted: 'Today',
    videoMeta: {
      duration: '0:15',
      durationSeconds: 15,
      codec: 'HEVC (H.265 Main 10)',
      bitrate: '54.6 Mbps',
      frameRate: 60,
      audioCodec: 'AAC 320kbps 5.1',
      hwTranscode: 'NVENC Active'
    },
    exif: {
      camera: 'DJI Mavic 3 Pro Cine',
      lens: 'Hasselblad 24mm F2.8',
      aperture: 'f/4.0',
      shutter: '1/120s',
      iso: 200,
      focalLength: '24mm',
      dimensions: '3840 x 2160 (4K UHD)',
      width: 3840,
      height: 2160,
      size: '98.2 MB',
      sizeBytes: 102970112,
      colorSpace: 'D-Log M 10-bit',
      dateTaken: '2026-08-15 19:48:02',
      format: 'MP4 / H.265'
    },
    location: {
      name: 'Marin Headlands',
      city: 'San Francisco, CA',
      country: 'United States',
      latitude: 37.8199,
      longitude: -122.4783,
      altitude: '142m'
    },
    tags: ['sanfrancisco', 'goldengate', 'sunset', 'drone', '4k'],
    detectedObjects: [
      { id: 'det-4', label: 'suspension bridge', confidence: 0.99, box: { ymin: 20, xmin: 10, ymax: 85, xmax: 90 }, category: 'object' },
      { id: 'det-5', label: 'water body', confidence: 0.96, box: { ymin: 60, xmin: 0, ymax: 100, xmax: 100 }, category: 'nature' }
    ],
    isFavorite: true,
    collection: 'Videos'
  },
  {
    id: 'media-03',
    title: 'IMG_2026_Macro_Dewdrop_Leaf.jpg',
    filename: 'IMG_2026_Macro_Dewdrop_Leaf.jpg',
    path: 'D:/GiaDinh/HinhAnh/Nature',
    url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2026-08-15',
    dateFormatted: 'Today',
    exif: {
      camera: 'Canon EOS R5',
      lens: 'RF 100mm F2.8L Macro IS USM',
      aperture: 'f/3.5',
      shutter: '1/320s',
      iso: 400,
      focalLength: '100mm',
      dimensions: '8192 x 5464',
      width: 8192,
      height: 5464,
      size: '18.4 MB',
      sizeBytes: 19293798,
      colorSpace: 'sRGB',
      dateTaken: '2026-08-15 07:15:40',
      format: 'JPEG'
    },
    location: {
      name: 'Golden Gate Park Conservatory',
      city: 'San Francisco, CA',
      country: 'United States',
      latitude: 37.7726,
      longitude: -122.4601
    },
    tags: ['macro', 'nature', 'dewdrops', 'botanical', 'green'],
    detectedObjects: [
      { id: 'det-6', label: 'leaf', confidence: 0.99, box: { ymin: 5, xmin: 5, ymax: 95, xmax: 95 }, category: 'nature' },
      { id: 'det-7', label: 'water droplets', confidence: 0.97, box: { ymin: 15, xmin: 25, ymax: 65, xmax: 75 }, category: 'nature' }
    ]
  },
  {
    id: 'media-04',
    title: 'IMG_2026_Architecture_Tower.jpg',
    filename: 'IMG_2026_Architecture_Tower.jpg',
    path: 'D:/GiaDinh/HinhAnh/Architecture',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2026-08-15',
    dateFormatted: 'Today',
    exif: {
      camera: 'Nikon Z8',
      lens: 'NIKKOR Z 14-24mm f/2.8 S',
      aperture: 'f/9.0',
      shutter: '1/250s',
      iso: 64,
      focalLength: '17mm',
      dimensions: '8256 x 5504',
      width: 8256,
      height: 5504,
      size: '21.8 MB',
      sizeBytes: 22858854,
      colorSpace: 'Adobe RGB',
      dateTaken: '2026-08-15 14:10:55',
      format: 'JPEG'
    },
    location: {
      name: 'Financial District',
      city: 'San Francisco, CA',
      country: 'United States',
      latitude: 37.7946,
      longitude: -122.3999
    },
    tags: ['architecture', 'skyscraper', 'urban', 'minimalist', 'lines'],
    detectedObjects: [
      { id: 'det-8', label: 'building facade', confidence: 0.98, box: { ymin: 5, xmin: 10, ymax: 95, xmax: 90 }, category: 'object' },
      { id: 'det-9', label: 'sky / overcast', confidence: 0.89, box: { ymin: 0, xmin: 0, ymax: 50, xmax: 100 }, category: 'nature' }
    ]
  },
  {
    id: 'media-05',
    title: 'IMG_2026_Tokyo_Rain_Night.jpg',
    filename: 'IMG_2026_Tokyo_Rain_Night.jpg',
    path: 'D:/GiaDinh/HinhAnh/Travel',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2026-08-15',
    dateFormatted: 'Today',
    exif: {
      camera: 'Fujifilm X-T5',
      lens: 'XF 33mm F1.4 R LM WR',
      aperture: 'f/1.4',
      shutter: '1/80s',
      iso: 800,
      focalLength: '33mm',
      dimensions: '7728 x 5152',
      width: 7728,
      height: 5152,
      size: '19.6 MB',
      sizeBytes: 20552089,
      colorSpace: 'ProNeg Hi (Classic Chrome)',
      dateTaken: '2026-08-15 21:30:11',
      format: 'JPEG'
    },
    location: {
      name: 'Omoide Yokocho, Shinjuku',
      city: 'Tokyo',
      country: 'Japan',
      latitude: 35.6938,
      longitude: 139.6995
    },
    tags: ['tokyo', 'cyberpunk', 'neon', 'rain', 'night', 'japan'],
    detectedObjects: [
      { id: 'det-10', label: 'neon signboard', confidence: 0.97, box: { ymin: 15, xmin: 10, ymax: 55, xmax: 45 }, category: 'object' },
      { id: 'det-11', label: 'person with umbrella', confidence: 0.94, box: { ymin: 45, xmin: 48, ymax: 85, xmax: 68 }, category: 'person' },
      { id: 'det-12', label: 'wet asphalt reflection', confidence: 0.96, box: { ymin: 65, xmin: 5, ymax: 98, xmax: 95 }, category: 'nature' }
    ],
    isFavorite: true
  },
  {
    id: 'media-06',
    title: 'IMG_2026_Workspace_DarkDesk.jpg',
    filename: 'IMG_2026_Workspace_DarkDesk.jpg',
    path: 'D:/GiaDinh/HinhAnh/Tech',
    url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2026-08-15',
    dateFormatted: 'Today',
    exif: {
      camera: 'Sony A7 IV',
      lens: 'FE 50mm F1.2 GM',
      aperture: 'f/2.0',
      shutter: '1/160s',
      iso: 250,
      focalLength: '50mm',
      dimensions: '7008 x 4672',
      width: 7008,
      height: 4672,
      size: '14.2 MB',
      sizeBytes: 14889779,
      colorSpace: 'sRGB',
      dateTaken: '2026-08-15 11:22:04',
      format: 'JPEG'
    },
    location: {
      name: 'Studio Lab',
      city: 'San Francisco, CA',
      country: 'United States',
      latitude: 37.7749,
      longitude: -122.4194
    },
    tags: ['workspace', 'desksetup', 'mechanical_keyboard', 'tech', 'gadgets'],
    detectedObjects: [
      { id: 'det-13', label: 'mechanical keyboard', confidence: 0.99, box: { ymin: 40, xmin: 15, ymax: 85, xmax: 70 }, category: 'object' },
      { id: 'det-14', label: 'mouse', confidence: 0.95, box: { ymin: 20, xmin: 65, ymax: 48, xmax: 88 }, category: 'object' },
      { id: 'det-15', label: 'smartphone', confidence: 0.93, box: { ymin: 30, xmin: 80, ymax: 80, xmax: 98 }, category: 'object' }
    ]
  },
  {
    id: 'media-07',
    title: 'IMG_2026_Coffee_Aroma.jpg',
    filename: 'IMG_2026_Coffee_Aroma.jpg',
    path: 'D:/GiaDinh/HinhAnh/Lifestyle',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2026-08-15',
    dateFormatted: 'Today',
    exif: {
      camera: 'Leica Q3',
      lens: 'Summilux 28mm f/1.7 ASPH',
      aperture: 'f/1.7',
      shutter: '1/60s',
      iso: 400,
      focalLength: '28mm',
      dimensions: '9520 x 6336',
      width: 9520,
      height: 6336,
      size: '22.1 MB',
      sizeBytes: 23173529,
      colorSpace: 'Leica Look Moody',
      dateTaken: '2026-08-15 08:30:15',
      format: 'JPEG'
    },
    location: {
      name: 'Sightglass Coffee',
      city: 'San Francisco, CA',
      country: 'United States',
      latitude: 37.7781,
      longitude: -122.4086
    },
    tags: ['coffee', 'espresso', 'morning', 'steaming', 'moody'],
    detectedObjects: [
      { id: 'det-16', label: 'coffee cup & saucer', confidence: 0.98, box: { ymin: 40, xmin: 20, ymax: 85, xmax: 80 }, category: 'object' },
      { id: 'det-17', label: 'wooden table', confidence: 0.95, box: { ymin: 60, xmin: 0, ymax: 100, xmax: 100 }, category: 'object' }
    ]
  },
  {
    id: 'media-08',
    title: 'IMG_2026_Yosemite_HalfDome.jpg',
    filename: 'IMG_2026_Yosemite_HalfDome.jpg',
    path: 'D:/GiaDinh/HinhAnh/Travel/Yosemite',
    url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2026-08-14',
    dateFormatted: 'Yesterday',
    exif: {
      camera: 'Sony A7R V',
      lens: 'FE 70-200mm F2.8 GM OSS II',
      aperture: 'f/5.6',
      shutter: '1/60s',
      iso: 100,
      focalLength: '135mm',
      dimensions: '9504 x 6336',
      width: 9504,
      height: 6336,
      size: '28.3 MB',
      sizeBytes: 29674700,
      colorSpace: 'Adobe RGB',
      dateTaken: '2026-08-14 20:05:44',
      format: 'JPEG'
    },
    location: {
      name: 'Glacier Point',
      city: 'Yosemite National Park',
      country: 'United States',
      latitude: 37.7304,
      longitude: -119.5736,
      altitude: '2,199m'
    },
    tags: ['yosemite', 'halfdome', 'sunset', 'nationalpark', 'granite'],
    detectedObjects: [
      { id: 'det-18', label: 'mountain / Half Dome', confidence: 0.99, box: { ymin: 35, xmin: 15, ymax: 85, xmax: 80 }, category: 'nature' },
      { id: 'det-19', label: 'sunset sky', confidence: 0.96, box: { ymin: 5, xmin: 5, ymax: 45, xmax: 95 }, category: 'nature' }
    ],
    isFavorite: true
  },
  {
    id: 'media-09',
    title: 'IMG_2026_Redwood_Forest_Mist.jpg',
    filename: 'IMG_2026_Redwood_Forest_Mist.jpg',
    path: 'D:/GiaDinh/HinhAnh/Travel/Yosemite',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2026-08-14',
    dateFormatted: 'Yesterday',
    exif: {
      camera: 'Sony A7R V',
      lens: 'FE 24-70mm F2.8 GM II',
      aperture: 'f/4.0',
      shutter: '1/50s',
      iso: 200,
      focalLength: '35mm',
      dimensions: '9504 x 6336',
      width: 9504,
      height: 6336,
      size: '25.7 MB',
      sizeBytes: 26948403,
      colorSpace: 'Adobe RGB',
      dateTaken: '2026-08-14 09:12:30',
      format: 'JPEG'
    },
    location: {
      name: 'Mariposa Grove',
      city: 'Yosemite National Park',
      country: 'United States',
      latitude: 37.5144,
      longitude: -119.5986
    },
    tags: ['forest', 'redwoods', 'mist', 'trees', 'hiking'],
    detectedObjects: [
      { id: 'det-20', label: 'trees / redwood', confidence: 0.98, box: { ymin: 5, xmin: 10, ymax: 95, xmax: 90 }, category: 'nature' },
      { id: 'det-21', label: 'trail path', confidence: 0.91, box: { ymin: 65, xmin: 30, ymax: 95, xmax: 65 }, category: 'nature' }
    ]
  },
  {
    id: 'media-10',
    title: 'IMG_2026_Granite_Rock_Texture.jpg',
    filename: 'IMG_2026_Granite_Rock_Texture.jpg',
    path: 'D:/GiaDinh/HinhAnh/Travel/Yosemite',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2026-08-14',
    dateFormatted: 'Yesterday',
    exif: {
      camera: 'Sony A7R V',
      lens: 'FE 24-70mm F2.8 GM II',
      aperture: 'f/8.0',
      shutter: '1/200s',
      iso: 100,
      focalLength: '50mm',
      dimensions: '9504 x 6336',
      width: 9504,
      height: 6336,
      size: '22.9 MB',
      sizeBytes: 24012390,
      colorSpace: 'Monochrome (B&W)',
      dateTaken: '2026-08-14 13:45:00',
      format: 'JPEG'
    },
    location: {
      name: 'El Capitan Meadow',
      city: 'Yosemite National Park',
      country: 'United States',
      latitude: 37.7339,
      longitude: -119.6377
    },
    tags: ['texture', 'granite', 'blackandwhite', 'rock', 'mineral'],
    detectedObjects: [
      { id: 'det-22', label: 'rock surface', confidence: 0.99, box: { ymin: 0, xmin: 0, ymax: 100, xmax: 100 }, category: 'nature' }
    ]
  },
  {
    id: 'media-11',
    title: 'IMG_2026_Yosemite_Waterfall_Silk.jpg',
    filename: 'IMG_2026_Yosemite_Waterfall_Silk.jpg',
    path: 'D:/GiaDinh/HinhAnh/Travel/Yosemite',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2026-08-14',
    dateFormatted: 'Yesterday',
    exif: {
      camera: 'Sony A7R V',
      lens: 'FE 16-35mm F2.8 GM',
      aperture: 'f/11.0',
      shutter: '2.5s (ND Filter)',
      iso: 50,
      focalLength: '21mm',
      dimensions: '9504 x 6336',
      width: 9504,
      height: 6336,
      size: '26.8 MB',
      sizeBytes: 28101836,
      colorSpace: 'Adobe RGB',
      dateTaken: '2026-08-14 17:33:19',
      format: 'JPEG'
    },
    location: {
      name: 'Bridalveil Fall',
      city: 'Yosemite National Park',
      country: 'United States',
      latitude: 37.7169,
      longitude: -119.6464
    },
    tags: ['waterfall', 'longexposure', 'yosemite', 'water', 'valley'],
    detectedObjects: [
      { id: 'det-23', label: 'waterfall stream', confidence: 0.98, box: { ymin: 20, xmin: 40, ymax: 85, xmax: 75 }, category: 'nature' },
      { id: 'det-24', label: 'cliff rock', confidence: 0.95, box: { ymin: 10, xmin: 10, ymax: 90, xmax: 45 }, category: 'nature' }
    ],
    isFavorite: true
  },
  {
    id: 'media-12',
    title: 'DOC_Passport_BioData_2025.jpg',
    filename: 'DOC_Passport_BioData_2025.jpg',
    path: 'D:/GiaDinh/Personal_Documents/ID',
    url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    type: 'id_card',
    date: '2026-07-28',
    dateFormatted: 'July 28, 2026',
    ocrData: {
      documentType: 'Passport',
      docId: 'P18942081B',
      issueDate: '2022-04-10',
      extractedText: [
        'PASSPORT / PASSEPORT',
        'SURNAME / NOM: NGUYEN',
        'GIVEN NAMES / PRENOMS: ALEX HOANG',
        'NATIONALITY: VIETNAM / USA',
        'DATE OF BIRTH: 14 MAY 1994',
        'AUTHORITY: EMBASSY OF THE SOCIALIST REPUBLIC',
        'MRZ: P<VNMNGUYEN<<ALEX<HOANG<<<<<<<<<<<<<<<<<<<'
      ]
    },
    exif: {
      camera: 'iPhone 15 Pro Max',
      lens: '24mm ƒ/1.78',
      aperture: 'f/1.8',
      shutter: '1/120s',
      iso: 80,
      focalLength: '24mm',
      dimensions: '4032 x 3024',
      width: 4032,
      height: 3024,
      size: '4.8 MB',
      sizeBytes: 5033164,
      dateTaken: '2026-07-28 14:02:11',
      format: 'HEIC / OCR Index'
    },
    tags: ['passport', 'identity', 'personal_id', 'travel_doc', 'secure_vault'],
    detectedObjects: [
      { id: 'det-25', label: 'passport book', confidence: 0.99, box: { ymin: 15, xmin: 15, ymax: 85, xmax: 85 }, category: 'document' },
      { id: 'det-26', label: 'face portrait', confidence: 0.97, box: { ymin: 35, xmin: 25, ymax: 65, xmax: 45 }, category: 'person' },
      { id: 'det-27', label: 'MRZ barcode zone', confidence: 0.98, box: { ymin: 70, xmin: 20, ymax: 85, xmax: 80 }, category: 'text' }
    ],
    collection: 'Personal ID'
  },
  {
    id: 'media-13',
    title: 'DOC_Server_Hosting_Invoice_Q3.jpg',
    filename: 'DOC_Server_Hosting_Invoice_Q3.jpg',
    path: 'D:/GiaDinh/Documents/Tax_2026',
    url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    type: 'document',
    date: '2026-08-01',
    dateFormatted: 'August 1, 2026',
    ocrData: {
      documentType: 'Invoice',
      docId: 'INV-2026-8842',
      totalAmount: '$450.00 USD',
      issueDate: '2026-08-01',
      extractedText: [
        'CLOUD HOSTING SERVICES INC.',
        'INVOICE #: INV-2026-8842',
        'BILLED TO: SELF-HOSTED CLOUD LAB',
        'ITEMS: DEDICATED NVMe GPU NODE (RTX 4090)',
        'PERIOD: 08/01/2026 - 08/31/2026',
        'SUBTOTAL: $450.00',
        'STATUS: PAID VIA STRIPE'
      ]
    },
    exif: {
      camera: 'Scanner / PDF Render Engine',
      lens: '300 DPI Optical Sensor',
      aperture: 'N/A',
      shutter: 'N/A',
      iso: 100,
      focalLength: 'N/A',
      dimensions: '2480 x 3508 (A4 300DPI)',
      width: 2480,
      height: 3508,
      size: '2.1 MB',
      sizeBytes: 2202009,
      dateTaken: '2026-08-01 09:00:00',
      format: 'PDF / OCR Text'
    },
    tags: ['invoice', 'receipt', 'tax', 'finance', 'cloud_hosting'],
    detectedObjects: [
      { id: 'det-28', label: 'invoice sheet', confidence: 0.99, box: { ymin: 5, xmin: 10, ymax: 95, xmax: 90 }, category: 'document' },
      { id: 'det-29', label: 'table grid', confidence: 0.96, box: { ymin: 30, xmin: 15, ymax: 70, xmax: 85 }, category: 'text' }
    ],
    collection: 'Documents'
  },
  {
    id: 'media-14',
    title: 'IMG_2023_Paris_Eiffel_Night.jpg',
    filename: 'IMG_2023_Paris_Eiffel_Night.jpg',
    path: 'D:/Photos/Travel/Europe',
    url: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=1600&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=600&q=80',
    type: 'image',
    date: '2023-06-20',
    dateFormatted: 'June 20, 2023',
    exif: {
      camera: 'Canon EOS R6',
      lens: 'RF 24-105mm F4L IS USM',
      aperture: 'f/4.0',
      shutter: '1/30s',
      iso: 1600,
      focalLength: '45mm',
      dimensions: '5472 x 3648',
      width: 5472,
      height: 3648,
      size: '16.8 MB',
      sizeBytes: 17616076,
      colorSpace: 'sRGB',
      dateTaken: '2023-06-20 22:45:10',
      format: 'JPEG'
    },
    location: {
      name: 'Champ de Mars',
      city: 'Paris',
      country: 'France',
      latitude: 48.8584,
      longitude: 2.2945
    },
    tags: ['paris', 'eiffeltower', 'nightlights', 'france', 'travel'],
    detectedObjects: [
      { id: 'det-30', label: 'Eiffel Tower', confidence: 0.99, box: { ymin: 10, xmin: 30, ymax: 90, xmax: 70 }, category: 'object' },
      { id: 'det-31', label: 'night sky glow', confidence: 0.92, box: { ymin: 0, xmin: 0, ymax: 50, xmax: 100 }, category: 'nature' }
    ],
    collection: 'Travel'
  }
];

export const SMART_COLLECTIONS: SmartCollection[] = [
  {
    id: 'col-id',
    title: 'Personal ID',
    description: "Passports, driver's licenses, and identification documents securely extracted and categorized.",
    icon: 'Contact',
    iconColor: '#A78BFA',
    itemsCount: 24,
    storageSize: '142 MB',
    storageBytes: 148897792,
    filterType: 'id_card',
    coverImages: ['https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80']
  },
  {
    id: 'col-doc',
    title: 'Documents',
    description: 'Invoices, contracts, receipts, and text-heavy images with full OCR search capability.',
    icon: 'FileText',
    iconColor: '#F59E0B',
    itemsCount: 1402,
    storageSize: '4.2 GB',
    storageBytes: 4509715660,
    filterType: 'document',
    coverImages: ['https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80']
  },
  {
    id: 'col-vid',
    title: 'Videos',
    description: 'Motion content, screen recordings, and long-form video files with auto-generated previews.',
    icon: 'PlayCircle',
    iconColor: '#EC4899',
    itemsCount: 348,
    storageSize: '184 GB',
    storageBytes: 197568495616,
    filterType: 'video',
    coverImages: ['https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=400&q=80']
  }
];

export const INDEXING_ACTIVITIES: IndexingActivity[] = [
  {
    id: 'act-1',
    title: 'Summer Vacation 2023',
    description: 'Processed 450 items • Extracted 12 locations',
    timeAgo: '2 mins ago',
    timestamp: Date.now() - 120000,
    icon: 'Plane',
    status: 'completed',
    details: {
      itemsCount: 450,
      extractedLocations: 12
    }
  },
  {
    id: 'act-2',
    title: 'Tax Documents 2022-2026',
    description: 'OCR completed • Found 14 invoices & receipts',
    timeAgo: '1 hr ago',
    timestamp: Date.now() - 3600000,
    icon: 'FileText',
    status: 'completed',
    details: {
      itemsCount: 86,
      ocrCount: 14
    }
  },
  {
    id: 'act-3',
    title: 'HEVC Transcoding Queue',
    description: 'Hardware transcoded 3 4K video streams via NVENC',
    timeAgo: '3 hrs ago',
    timestamp: Date.now() - 10800000,
    icon: 'Cpu',
    status: 'completed',
    details: {
      itemsCount: 3,
      transcodedCount: 3
    }
  },
  {
    id: 'act-4',
    title: 'YOLOv8-nano Object Clustering',
    description: 'Generated 1,240 bounding boxes across Nature & Travel albums',
    timeAgo: '5 hrs ago',
    timestamp: Date.now() - 18000000,
    icon: 'Sparkles',
    status: 'completed',
    details: {
      itemsCount: 1240
    }
  }
];

export const DEFAULT_HARDWARE_STATUS: SystemHardwareStatus = {
  gpuModel: 'NVIDIA GeForce GTX 1050',
  gpuName: 'NVIDIA GeForce GTX 1050',
  gpuUsage: 14,
  gpuMemory: '2.4 / 4.0 GB',
  hwAccelEngine: 'NVIDIA NVENC (CUDA 12.4)',
  cpuModel: 'AMD Ryzen 9 7950X 16-Core Processor',
  cpuUsage: 8,
  cpuUsagePercent: '8',
  cpuCores: 16,
  drives: [],
  ramAppBytes: 0,
  ramSystemUsedBytes: 0,
  ramSystemTotalBytes: 0,
  storageDrive: 'Loading...',
  storageTotal: 0,
  storageUsed: 0,
  storagePercent: 0,
  activeWorkers: 4,
  ffmpegStatus: 'HW_ACCELERATED',
  yoloEngine: 'YOLOv8-nano (ONNX Runtime Local)',
  yoloInferenceAvgMs: 14.2,
  vpnMesh: {
    provider: 'Tailscale',
    status: 'Connected',
    virtualIp: '100.84.192.42',
    peers: 4
  },
  reverseProxy: {
    type: 'Nginx',
    ssl: true,
    domain: 'vault.home.lan / media.tailnet.ts.net',
    forwardedIp: '192.168.1.105'
  },
  dbStats: {
    engine: 'SQLite 3 (WAL Mode)',
    records: 3842,
    dbSize: '48.6 MB',
    cacheHitRatio: '99.4%'
  }
};
