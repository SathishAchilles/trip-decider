// Unsplash photos, resized to 1600 px wide. Credits: public/destinations/CREDITS.md.

export type Photo = {
  src: string;
  alt: string;
  photographer: string;
  profileUrl: string;
  photoUrl: string;
};

const UTM = "?utm_source=trip_decider&utm_medium=referral";

function photo(id: string, alt: string, photographer: string, username: string, photoId: string): Photo {
  return {
    src: `/destinations/${id}.jpg`,
    alt,
    photographer,
    profileUrl: `https://unsplash.com/@${username}${UTM}`,
    photoUrl: `https://unsplash.com/photos/${photoId}${UTM}`,
  };
}

export const PHOTOS: Record<string, Photo> = {
  goa: photo("goa", "Palm trees and colourful beach huts on a Goa beach", "Sumit Sourav", "sumit731", "eSRtxPd9q1c"),
  gokarna: photo("gokarna", "Rocky shoreline and calm sea at Gokarna", "Chandan Shastri", "chandanshastri", "g26VrtJ_e30"),
  pondicherry: photo("pondicherry", "Red scooter against a yellow wall in Pondicherry's French Quarter", "Niranjan B S", "bsniru", "PxiAd9EgJjc"),
  varkala: photo("varkala", "Beach below the green cliffs of Varkala", "Mohamed Adil", "mohamed_adil_tvl", "41AgvKjujtQ"),
  coorg: photo("coorg", "Misty layered hills and forest in Coorg", "bluedeadpixel X_X", "bluedeadpixel", "ynhPIGgGa2g"),
  munnar: photo("munnar", "Tea plantations below a cloud-capped hill in Munnar", "Anshul Tilondiya", "anshul_tilondiya", "2_aLe9hC3_E"),
  hampi: photo("hampi", "Stone chariot and temple tower at Hampi", "Aravind Shivkumar", "aravind_shivkumar", "jDMCUnvD5lY"),
  lonavala: photo("lonavala", "Highway winding through the green ghats near Lonavala", "Sonika Agarwal", "sonika_agarwal", "faj5OtHI9fg"),
  udaipur: photo("udaipur", "City Palace on the banks of Lake Pichola, Udaipur", "Pranav Panchal", "pranavpanchal", "IEArgDckRuQ"),
  jaipur: photo("jaipur", "Decorated horses passing Hawa Mahal in Jaipur", "Aditya Siva", "msaditya9", "6rDbvXzIVpQ"),
  rishikesh: photo("rishikesh", "Tiered temple above the Ganga at Rishikesh", "Prashant bamnawat", "prashant_bamnawat_", "G3s8fwt5H4M"),
  manali: photo("manali", "Snow-covered peaks above the town of Manali", "Naman jaswani", "nj2797", "Xpwj1j1HX34"),
  kasol: photo("kasol", "Pine forest and stream in the Parvati Valley near Kasol", "Sajal Das", "neeloriginals", "0ETSZ-tT9Aw"),
  darjeeling: photo("darjeeling", "Hill village and tea slopes in the clouds near Darjeeling", "Dipankar Bailung", "bailung_image2024", "haA_CbEDcDg"),
  hero: photo("hero", "Morning haze over fields and hills in southern India", "Remi Clinton", "remi_anton", "E5egsk4eUQ0"),
};

export const HERO_PHOTO = PHOTOS.hero;
