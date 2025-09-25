import Joi from "@hapi/joi";

interface RegisterCommomData {
  fullName: string;
  phone: string;
  cpf: string;
  dataNascimento: string;
  genero: "masc" | "fem" | "naosei";
  cidade: string;
  estado: string;
  cep: string;
  email: string;
  password: string;
  urlPhoto?: string;
  competencias?: string[];
  curriculo?: string;
}

interface RegisterOrgData {
  nomeEmpresa: string;
  cnpj: string;
  contato: string;
  setor: string;
  cidade: string;
  estado: string;
  cep: string;
  descricao: string;
  email: string;
  password: string;
  redesSociais?: string[];
  website?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface ValidationResult<T> {
  error?: Joi.ValidationError | undefined;
  value: T | undefined;
}

const registerValidate = (
  data: unknown
): ValidationResult<RegisterCommomData> => {
  const schema = Joi.object({
    fullName: Joi.string().min(1).required().messages({
      "string.empty": "O nome completo é obrigatório.",
      "any.required": "O nome completo é obrigatório.",
    }),

    phone: Joi.string().min(1).required().messages({
      "string.empty": "O telefone é obrigatório.",
      "any.required": "O telefone é obrigatório.",
    }),

    cpf: Joi.string()
      .pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
      .required()
      .messages({
        "string.empty": "O CPF é obrigatório.",
        "any.required": "O CPF é obrigatório.",
        "string.pattern.base": "Formato de CPF inválido.",
      }),

    dataNascimento: Joi.string().min(1).required().messages({
      "string.empty": "A data de nascimento é obrigatória.",
      "any.required": "A data de nascimento é obrigatória.",
    }),

    genero: Joi.string().valid("masc", "fem", "naosei").required().messages({
      "any.only": "O gênero é obrigatório.",
      "any.required": "O gênero é obrigatório.",
    }),

    cidade: Joi.string().min(1).required().messages({
      "string.empty": "A cidade é obrigatória.",
      "any.required": "A cidade é obrigatória.",
    }),

    estado: Joi.string().min(1).required().messages({
      "string.empty": "O estado é obrigatório.",
      "any.required": "O estado é obrigatório.",
    }),

    cep: Joi.string()
      .pattern(/^\d{5}-\d{3}$/)
      .required()
      .messages({
        "string.empty": "O CEP é obrigatório.",
        "any.required": "O CEP é obrigatório.",
        "string.pattern.base": "Formato de CEP inválido.",
      }),

    email: Joi.string().email().required().messages({
      "string.empty": "O email é obrigatório.",
      "any.required": "O email é obrigatório.",
      "string.email": "Email inválido.",
    }),

    confirmEmail: Joi.string().min(1).required().messages({
      "string.empty": "A confirmação de email é obrigatória.",
      "any.required": "A confirmação de email é obrigatória.",
    }),

    password: Joi.string().min(6).required().messages({
      "string.empty": "A senha é obrigatória.",
      "any.required": "A senha é obrigatória.",
      "string.min": "A senha deve ter no mínimo 6 caracteres.",
    }),

    confirmPassword: Joi.string().min(1).required().messages({
      "string.empty": "A confirmação de senha é obrigatória.",
      "any.required": "A confirmação de senha é obrigatória.",
    }),

    urlPhoto: Joi.string().uri().optional().messages({
      "string.uri": "A URL da foto deve ser válida.",
    }),

    competencias: Joi.array().items(Joi.string()).optional().messages({
      "array.base": "As competências devem ser uma lista de textos.",
      "string.base": "Cada competência deve ser uma string.",
    }),

    curriculo: Joi.string().uri().optional().messages({
      "string.uri": "A URL do currículo deve ser válida.",
    }),
  }).unknown(true);

  return schema.validate(data);
};

const registerOrgValidate = (
  data: unknown
): ValidationResult<RegisterOrgData> => {
  const schema = Joi.object({
    nomeEmpresa: Joi.string().min(1).required().messages({
      "string.empty": "O nome da empresa é obrigatório.",
      "any.required": "O nome da empresa é obrigatório.",
    }),

    cnpj: Joi.string()
      .pattern(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/)
      .required()
      .messages({
        "string.empty": "O CNPJ é obrigatório.",
        "any.required": "O CNPJ é obrigatório.",
        "string.pattern.base": "Formato de CNPJ inválido.",
      }),

    contato: Joi.string().min(1).required().messages({
      "string.empty": "O contato é obrigatório.",
      "any.required": "O contato é obrigatório.",
    }),

    setor: Joi.string().min(1).required().messages({
      "string.empty": "O setor é obrigatório.",
      "any.required": "O setor é obrigatório.",
    }),

    cidade: Joi.string().min(1).required().messages({
      "string.empty": "A cidade é obrigatória.",
      "any.required": "A cidade é obrigatória.",
    }),

    estado: Joi.string().min(1).required().messages({
      "string.empty": "O estado é obrigatório.",
      "any.required": "O estado é obrigatório.",
    }),

    cep: Joi.string()
      .pattern(/^\d{5}-\d{3}$/)
      .required()
      .messages({
        "string.empty": "O CEP é obrigatório.",
        "any.required": "O CEP é obrigatório.",
        "string.pattern.base": "Formato de CEP inválido.",
      }),

    website: Joi.string().uri().allow("").optional().messages({
      "string.uri": "URL inválida.",
    }),

    redesSociais: Joi.string().allow("").optional().messages({
      "string.base": "As redes sociais devem ser uma string.",
    }),

    descricao: Joi.string().min(1).required().messages({
      "string.empty": "A descrição é obrigatória.",
      "any.required": "A descrição é obrigatória.",
    }),

    email: Joi.string().email().required().messages({
      "string.empty": "O email é obrigatório.",
      "any.required": "O email é obrigatório.",
      "string.email": "Email inválido.",
    }),

    confirmEmail: Joi.string().min(1).required().messages({
      "string.empty": "A confirmação de email é obrigatória.",
      "any.required": "A confirmação de email é obrigatória.",
    }),

    password: Joi.string().min(6).required().messages({
      "string.empty": "A senha é obrigatória.",
      "any.required": "A senha é obrigatória.",
      "string.min": "A senha deve ter no mínimo 6 caracteres.",
    }),

    confirmPassword: Joi.string().min(1).required().messages({
      "string.empty": "A confirmação de senha é obrigatória.",
      "any.required": "A confirmação de senha é obrigatória.",
    }),
  }).unknown(true);

  return schema.validate(data);
};

const loginValidate = (data: unknown): ValidationResult<LoginData> => {
  const schema = Joi.object({
    email: Joi.string().required().min(3).max(100),
    password: Joi.string().required().min(6).max(200),
  }).unknown(true);

  return schema.validate(data);
};

export { registerValidate, registerOrgValidate, loginValidate };
