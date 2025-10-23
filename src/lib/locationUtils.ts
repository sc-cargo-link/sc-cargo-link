// Location name cleaning utilities extracted from Record.tsx and CapturePeerHandler.tsx

export interface LocationData {
  PoiName: string;
  // Add other properties as needed
}

/**
 * Cleans individual location names by removing common suffixes and prefixes
 * @param locationName - The raw location name to clean
 * @param locationData - Optional array of known locations for fallback matching
 * @returns Cleaned location name
 */
export const cleanLocationName = (locationName: string, locationData?: LocationData[]): string => {
  if (!locationName) return locationName;
  
  let cleaned = locationName.trim();
  
  // Remove " above" and everything after it
  // e.g., "Seraphim Station above Crusader" => "Seraphim Station"
  const aboveIndex = cleaned.indexOf(' above');
  if (aboveIndex !== -1) {
    cleaned = cleaned.substring(0, aboveIndex);
  }
  
  // Remove " at" and everything after it
  // e.g., "Beautiful Glen Station at Crusader's L5 Lagrange point" => "Beautiful Glen Station"
  const atIndex = cleaned.indexOf(' at');
  if (atIndex !== -1) {
    cleaned = cleaned.substring(0, atIndex);
  }
  
  // Remove XXX-L\d pattern at the beginning
  // e.g., "CRU-L1 Ambitious Dream Station" => "Ambitious Dream Station"
  cleaned = cleaned.replace(/^[A-Z]{3}-L.\s+/, '');
  
  // If the cleaned name is empty or very short, try to find it in LocationData
  if (cleaned.length < 3 && locationData) {
    const locationMatch = findLocationInLocationData(locationName, locationData);
    if (locationMatch) {
      cleaned = locationMatch.PoiName;
    }
  }
  
  return cleaned.trim();
};

/**
 * Finds a location in LocationData array using exact or partial matching
 * @param locationName - The location name to search for
 * @param locationData - Array of known locations
 * @returns Matching LocationData object or null
 */
export const findLocationInLocationData = (locationName: string, locationData: LocationData[]): LocationData | null => {
  const normalizedName = locationName.toLowerCase().trim();
  
  // Try exact match first
  let match = locationData.find(item => 
    item.PoiName.toLowerCase() === normalizedName
  );
  
  // If no exact match, try partial match
  if (!match) {
    match = locationData.find(item => 
      item.PoiName.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(item.PoiName.toLowerCase())
    );
  }
  
  return match || null;
};

/**
 * Cleans station names in contract records
 * @param records - Array of contract records
 * @param locationData - Optional array of known locations for fallback matching
 * @returns Array of records with cleaned location names
 */
export const cleanStationNames = (records: any[], locationData?: LocationData[]): any[] => {
  // Ensure records is an array
  if (!Array.isArray(records)) {
    console.warn('cleanStationNames: records is not an array:', records);
    return [];
  }
  
  return records.map(record => ({
    ...record,
    objective: record.objective.map((obj: any) => ({
      ...obj,
      location: cleanLocationName(obj.location, locationData),
      deliveries: obj.deliveries?.map((del: any) => ({
        ...del,
        location: cleanLocationName(del.location, locationData)
      })) || []
    }))
  }));
};

/**
 * Cleans a single station name for use in entity matching
 * @param stationName - The station name to clean
 * @returns Cleaned station name
 */
export const cleanStationNameForMatching = (stationName: string): string => {
  if (!stationName) return stationName;
  
  let cleaned = stationName.trim();
  
  // Remove common suffixes that might interfere with matching
  const suffixesToRemove = [
    ' above',
    ' at',
    ' Station',
    ' Port',
    ' Hub',
    ' Terminal',
    ' Dock',
    ' Landing Zone',
    ' LZ'
  ];
  
  for (const suffix of suffixesToRemove) {
    const index = cleaned.indexOf(suffix);
    if (index !== -1) {
      cleaned = cleaned.substring(0, index);
    }
  }
  
  // Remove XXX-L\d pattern at the beginning
  cleaned = cleaned.replace(/^[A-Z]{3}-L.\s+/, '');
  
  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};
