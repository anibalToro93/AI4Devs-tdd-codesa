// Primero definimos la interfaz para un candidato
export interface Candidate {
    id?: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    createdAt?: string;
    educations?: Education[];
    workExperiences?: WorkExperience[];
}

// Interfaces adicionales necesarias
export interface Education {
    institution: string;
    title: string;
    startDate: string;
    endDate?: string;
}

export interface WorkExperience {
    company: string;
    position: string;
    description?: string;
    startDate: string;
    endDate?: string;
}

// Actualizamos la interfaz PrismaMock para incluir los tipos correctos
export interface PrismaMock {
    candidate: {
        create: jest.Mock;
        findUnique: jest.Mock;
    }
}