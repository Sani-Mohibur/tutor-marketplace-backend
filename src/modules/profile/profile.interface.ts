// studentProfile Interface
export interface UpdateStudentData {
  name?: string;
  bio?: string;
  education?: string;
  interests?: string[];
  phone?: string;
  address?: string;
}

// tutorProfile Interface
export interface UpdateTutorData {
  name?: string;
  title?: string;
  bio?: string;
  qualifications?: string;
  skills?: string[];
  experienceYears?: number;
  pricePerHour?: number;
  categories?: string[];
  images?: string[];
}
