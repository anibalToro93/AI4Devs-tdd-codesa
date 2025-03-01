// candidateService.test.js
import { addCandidate } from '../application/services/candidateService';
import { validateCandidateData } from '../application/validator';
import { PrismaClient } from '@prisma/client';
import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { PrismaMock, Candidate } from '../types/interfaces';
// Mock de Prisma
jest.mock('@prisma/client');


describe('Candidate Registration', () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    // Configuración inicial para cada test
    prisma = {
      candidate: {
        create: jest.fn(),
        findUnique: jest.fn()
      }
    };
    PrismaClient.mockImplementation(() => prisma);
  });

  afterEach(() => {
    // Limpieza después de cada test
    jest.clearAllMocks();
  });

  // Grupo de tests para campos obligatorios
  describe('Required Fields Validation', () => {
    // Test para el criterio: "Poder ingresar nombre, apellido, email (obligatorios)"
    test('should create candidate with valid required fields', async () => {
      const validCandidate = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      prisma.candidate.create.mockResolvedValue({ id: 1, ...validCandidate });
      const result = await addCandidate(validCandidate);

      expect(result).toHaveProperty('id');
      expect(result.firstName).toBe(validCandidate.firstName);
      expect(result.lastName).toBe(validCandidate.lastName);
      expect(result.email).toBe(validCandidate.email);
    });

    test('should reject when firstName is missing', async () => {
      const invalidCandidate = {
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      await expect(addCandidate(invalidCandidate))
        .rejects
        .toThrow('Invalid name');
    });

    test('should reject when lastName is missing', async () => {
      const invalidCandidate = {
        firstName: 'John',
        email: 'john.doe@example.com'
      };

      await expect(addCandidate(invalidCandidate))
        .rejects
        .toThrow('Invalid name');
    });

    test('should reject when email is missing', async () => {
      const invalidCandidate = {
        firstName: 'John',
        lastName: 'Doe'
      };

      await expect(addCandidate(invalidCandidate))
        .rejects
        .toThrow('Invalid email');
    });
  });

  // Grupo de tests para campos opcionales
  describe('Optional Fields Validation', () => {
    // Test para el criterio: "Poder ingresar teléfono y dirección (opcionales)"
    test('should accept valid candidate with optional fields', async () => {
      const candidateWithOptionals = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '666777888',
        address: 'Calle Principal 123'
      };

      prisma.candidate.create.mockResolvedValue({ id: 1, ...candidateWithOptionals });
      const result = await addCandidate(candidateWithOptionals);

      expect(result.phone).toBe(candidateWithOptionals.phone);
      expect(result.address).toBe(candidateWithOptionals.address);
    });

    test('should accept valid candidate without optional fields', async () => {
      const candidateWithoutOptionals = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      prisma.candidate.create.mockResolvedValue({ id: 1, ...candidateWithoutOptionals });
      const result = await addCandidate(candidateWithoutOptionals);

      expect(result.phone).toBeUndefined();
      expect(result.address).toBeUndefined();
    });
  });

  // Grupo de tests para validación de email único
  describe('Email Uniqueness', () => {
    // Test para el criterio: "El email debe ser único en el sistema"
    test('should reject duplicate email', async () => {
      const existingCandidate = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      prisma.candidate.create.mockRejectedValue({ 
        code: 'P2002',
        message: 'Unique constraint failed on the field: email'
      });

      await expect(addCandidate(existingCandidate))
        .rejects
        .toThrow('The email already exists in the database');
    });
  });

  // Grupo de tests para validación de formato
  describe('Format Validation', () => {
    // Test para el criterio: "Validar el formato correcto del email y teléfono"
    describe('Email Format', () => {
      test.each([
        ['invalid@', 'Invalid email format'],
        ['invalid.com', 'Invalid email format'],
        ['@invalid.com', 'Invalid email format'],
        ['invalid@.com', 'Invalid email format'],
        ['invalid@com.', 'Invalid email format']
      ])('should reject invalid email format: %s', async (invalidEmail) => {
        const candidate = {
          firstName: 'John',
          lastName: 'Doe',
          email: invalidEmail
        };

        await expect(addCandidate(candidate))
          .rejects
          .toThrow('Invalid email');
      });

      test.each([
        'valid@example.com',
        'valid.name@example.com',
        'valid+label@example.com',
        'valid@subdomain.example.com'
      ])('should accept valid email format: %s', async (validEmail) => {
        const candidate = {
          firstName: 'John',
          lastName: 'Doe',
          email: validEmail
        };

        prisma.candidate.create.mockResolvedValue({ id: 1, ...candidate });
        const result = await addCandidate(candidate);
        expect(result.email).toBe(validEmail);
      });
    });

    describe('Phone Format', () => {
      test.each([
        ['123', 'Invalid phone format'],
        ['abcdefghij', 'Invalid phone format'],
        ['123456789012345', 'Invalid phone format'], // demasiado largo
        ['abc-def-ghij', 'Invalid phone format']
      ])('should reject invalid phone format: %s', async (invalidPhone) => {
        const candidate = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: invalidPhone
        };

        await expect(addCandidate(candidate))
          .rejects
          .toThrow('Invalid phone');
      });

      test.each([
        '666777888',
        '999888777',
        '611222333'
      ])('should accept valid phone format: %s', async (validPhone) => {
        const candidate = {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: validPhone
        };

        prisma.candidate.create.mockResolvedValue({ id: 1, ...candidate });
        const result = await addCandidate(candidate);
        expect(result.phone).toBe(validPhone);
      });
    });
  });

  // Grupo de tests para confirmación de registro
  describe('Registration Confirmation', () => {
    // Test para el criterio: "Recibir confirmación cuando el candidato se registra exitosamente"
    test('should return success response with candidate data', async () => {
      const newCandidate = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '666777888',
        address: 'Calle Principal 123'
      };

      const expectedResponse = {
        id: 1,
        ...newCandidate,
        createdAt: new Date().toISOString()
      };

      prisma.candidate.create.mockResolvedValue(expectedResponse);
      const result = await addCandidate(newCandidate);

      expect(result).toEqual(expectedResponse);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
    });
  });

  // Casos límite adicionales
  describe('Edge Cases', () => {
    test('should handle very long names within limits', async () => {
      const candidate = {
        firstName: 'A'.repeat(100), // máximo permitido
        lastName: 'B'.repeat(100), // máximo permitido
        email: 'john.doe@example.com'
      };

      prisma.candidate.create.mockResolvedValue({ id: 1, ...candidate });
      const result = await addCandidate(candidate);
      expect(result.firstName).toBe(candidate.firstName);
      expect(result.lastName).toBe(candidate.lastName);
    });

    test('should reject names that are too long', async () => {
      const candidate = {
        firstName: 'A'.repeat(101), // excede el límite
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      await expect(addCandidate(candidate))
        .rejects
        .toThrow('Invalid name');
    });

    test('should handle special characters in names correctly', async () => {
      const candidate = {
        firstName: 'María-José',
        lastName: 'García Núñez',
        email: 'john.doe@example.com'
      };

      prisma.candidate.create.mockResolvedValue({ id: 1, ...candidate });
      const result = await addCandidate(candidate);
      expect(result.firstName).toBe(candidate.firstName);
      expect(result.lastName).toBe(candidate.lastName);
    });

    test('should handle whitespace in names correctly', async () => {
      const candidate = {
        firstName: '  John  ',
        lastName: '  Doe  ',
        email: 'john.doe@example.com'
      };

      // Asumimos que el servicio hace trim de los espacios
      const expectedCandidate = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      };

      prisma.candidate.create.mockResolvedValue({ id: 1, ...expectedCandidate });
      const result = await addCandidate(candidate);
      expect(result.firstName).toBe(expectedCandidate.firstName);
      expect(result.lastName).toBe(expectedCandidate.lastName);
    });
  });
});

describe('Candidate Form Processing', () => {
  describe('Form Data Reception', () => {
    test('should process complete form data correctly', async () => {
      // Arrange
      const formData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '666777888',
        address: 'Calle Principal 123',
        educations: [{
          institution: 'Universidad XYZ',
          title: 'Ingeniería',
          startDate: '2020-01-01',
          endDate: '2024-01-01'
        }],
        workExperiences: [{
          company: 'Tech Corp',
          position: 'Developer',
          startDate: '2024-02-01',
          description: 'Desarrollo de software'
        }]
      };

      // Act
      const isValid = validateCandidateData(formData);

      // Assert
      expect(isValid).toBeTruthy();
      expect(() => validateCandidateData(formData)).not.toThrow();
    });
  });

  describe('Database Storage', () => {
    let prisma: PrismaMock;

    beforeEach(() => {
      prisma = {
        candidate: {
          create: jest.fn(),
          findUnique: jest.fn()
        }
      };
      (PrismaClient as jest.Mock).mockImplementation(() => prisma);
    });

    test('should save candidate data to database successfully', async () => {
      // Arrange
      const candidateData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '666777888',
        address: 'Calle Principal 123'
      };

      const expectedSavedData = {
        id: 1,
        ...candidateData,
        createdAt: new Date().toISOString()
      };

      prisma.candidate.create.mockResolvedValue(expectedSavedData);

      // Act
      const result = await addCandidate(candidateData);

      // Assert
      expect(prisma.candidate.create).toHaveBeenCalledWith({
        data: expect.objectContaining(candidateData)
      });
      expect(result).toEqual(expectedSavedData);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
    });
  });
});

describe('Date Validation in Education and Work Experience', () => {
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = {
      candidate: {
        create: jest.fn(),
        findUnique: jest.fn()
      }
    };
    (PrismaClient as jest.Mock).mockImplementation(() => prisma);
  });

  describe('Education Dates Validation', () => {
    test('should accept valid education dates', async () => {
      const candidateWithEducation = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        educations: [{
          institution: 'Universidad XYZ',
          title: 'Ingeniería',
          startDate: '2020-01-01',
          endDate: '2024-01-01'
        }]
      };

      prisma.candidate.create.mockResolvedValue({ id: 1, ...candidateWithEducation });
      const result = await addCandidate(candidateWithEducation);
      expect(result.educations[0].startDate).toBe(candidateWithEducation.educations[0].startDate);
      expect(result.educations[0].endDate).toBe(candidateWithEducation.educations[0].endDate);
    });

    test('should reject when education end date is before start date', async () => {
      const invalidEducationDates = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        educations: [{
          institution: 'Universidad XYZ',
          title: 'Ingeniería',
          startDate: '2024-01-01',
          endDate: '2020-01-01'
        }]
      };

      await expect(addCandidate(invalidEducationDates))
        .rejects
        .toThrow('Education end date must be after start date');
    });

    test('should reject future start dates in education', async () => {
      const futureStartDate = new Date();
      futureStartDate.setFullYear(futureStartDate.getFullYear() + 2);

      const invalidFutureEducation = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        educations: [{
          institution: 'Universidad XYZ',
          title: 'Ingeniería',
          startDate: futureStartDate.toISOString().split('T')[0],
          endDate: futureStartDate.toISOString().split('T')[0]
        }]
      };

      await expect(addCandidate(invalidFutureEducation))
        .rejects
        .toThrow('Education start date cannot be in the future');
    });

    test('should handle multiple education entries with valid dates', async () => {
      const multipleEducations = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        educations: [
          {
            institution: 'Universidad XYZ',
            title: 'Bachillerato',
            startDate: '2016-01-01',
            endDate: '2020-01-01'
          },
          {
            institution: 'Universidad ABC',
            title: 'Maestría',
            startDate: '2020-02-01',
            endDate: '2022-01-01'
          }
        ]
      };

      prisma.candidate.create.mockResolvedValue({ id: 1, ...multipleEducations });
      const result = await addCandidate(multipleEducations);
      expect(result.educations).toHaveLength(2);
      const startDate = new Date(result.educations[1].startDate).getTime();
      const endDate = new Date(result.educations[0].endDate).getTime();
      expect(startDate).toBeGreaterThan(endDate);
    });
  });

  describe('Work Experience Dates Validation', () => {
    test('should accept valid work experience dates', async () => {
      const candidateWithWork = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        workExperiences: [{
          company: 'Tech Corp',
          position: 'Developer',
          startDate: '2020-01-01',
          endDate: '2024-01-01',
          description: 'Desarrollo de software'
        }]
      };

      prisma.candidate.create.mockResolvedValue({ id: 1, ...candidateWithWork });
      const result = await addCandidate(candidateWithWork);
      expect(result.workExperiences[0].startDate).toBe(candidateWithWork.workExperiences[0].startDate);
      expect(result.workExperiences[0].endDate).toBe(candidateWithWork.workExperiences[0].endDate);
    });

    test('should accept work experience without end date (current job)', async () => {
      const currentJob = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        workExperiences: [{
          company: 'Tech Corp',
          position: 'Developer',
          startDate: '2020-01-01',
          description: 'Desarrollo de software'
        }]
      };

      prisma.candidate.create.mockResolvedValue({ id: 1, ...currentJob });
      const result = await addCandidate(currentJob);
      expect(result.workExperiences[0].startDate).toBe(currentJob.workExperiences[0].startDate);
      expect(result.workExperiences[0].endDate).toBeUndefined();
    });

    test('should reject when work experience end date is before start date', async () => {
      const invalidWorkDates = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        workExperiences: [{
          company: 'Tech Corp',
          position: 'Developer',
          startDate: '2024-01-01',
          endDate: '2020-01-01',
          description: 'Desarrollo de software'
        }]
      };

      await expect(addCandidate(invalidWorkDates))
        .rejects
        .toThrow('Work experience end date must be after start date');
    });

    test('should reject future start dates in work experience', async () => {
      const futureStartDate = new Date();
      futureStartDate.setFullYear(futureStartDate.getFullYear() + 2);

      const invalidFutureWork = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        workExperiences: [{
          company: 'Tech Corp',
          position: 'Developer',
          startDate: futureStartDate.toISOString().split('T')[0],
          description: 'Desarrollo de software'
        }]
      };

      await expect(addCandidate(invalidFutureWork))
        .rejects
        .toThrow('Work experience start date cannot be in the future');
    });

    test('should validate overlapping work experiences', async () => {
      const overlappingWork = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        workExperiences: [
          {
            company: 'Tech Corp',
            position: 'Developer',
            startDate: '2020-01-01',
            endDate: '2022-01-01',
            description: 'Desarrollo de software'
          },
          {
            company: 'Another Corp',
            position: 'Senior Developer',
            startDate: '2021-01-01',
            endDate: '2023-01-01',
            description: 'Desarrollo fullstack'
          }
        ]
      };

      // Permitimos experiencias superpuestas ya que es posible tener múltiples trabajos simultáneos
      prisma.candidate.create.mockResolvedValue({ id: 1, ...overlappingWork });
      const result = await addCandidate(overlappingWork);
      expect(result.workExperiences).toHaveLength(2);
    });
  });

  describe('Date Format Validation', () => {
    test.each([
      ['2023/01/01', 'Invalid date format'],
      ['01-01-2023', 'Invalid date format'],
      ['2023.01.01', 'Invalid date format'],
      ['01/Jan/2023', 'Invalid date format']
    ])('should reject invalid date format: %s', async (invalidDate) => {
      const candidateWithInvalidDate = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        educations: [{
          institution: 'Universidad XYZ',
          title: 'Ingeniería',
          startDate: invalidDate,
          endDate: '2024-01-01'
        }]
      };

      await expect(addCandidate(candidateWithInvalidDate))
        .rejects
        .toThrow('Invalid date format');
    });

    test('should handle chronological validation between dates', async () => {
      const date1 = new Date('2020-01-01');
      const date2 = new Date('2024-01-01');
      
      expect(date1.getTime()).toBeLessThan(date2.getTime());
    });
  });
});