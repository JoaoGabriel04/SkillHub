import { Schema, model } from "mongoose";

const userSchema = new Schema({
  fullName: {
    type: String,
    required: [true, "O nome completo é obrigatório."],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, "O telefone é obrigatório."],
  },
  cpf: {
    type: String,
    required: [true, "O CPF é obrigatório."],
    match: [/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "Formato de CPF inválido."],
    unique: true,
  },
  dataNascimento: {
    type: String,
    required: [true, "A data de nascimento é obrigatória."],
  },
  genero: {
    type: String,
    enum: ["masc", "fem", "naosei"],
    required: [true, "O gênero é obrigatório."],
  },
  cidade: {
    type: String,
    required: [true, "A cidade é obrigatória."],
  },
  estado: {
    type: String,
    required: [true, "O estado é obrigatório."],
  },
  cep: {
    type: String,
    required: [true, "O CEP é obrigatório."],
    match: [/^\d{5}-\d{3}$/, "Formato de CEP inválido."],
  },
  email: {
    type: String,
    required: [true, "O email é obrigatório."],
    unique: true,
    lowercase: true,
    match: [/\S+@\S+\.\S+/, "Email inválido."],
  },
  password: {
    type: String,
    required: [true, "A senha é obrigatória."],
    minlength: [6, "A senha deve ter no mínimo 6 caracteres."],
  },
  urlPhoto: {
    type: String,
    default: "",
  },
  competencias: {
    type: [String],
    default: [],
  },
  curriculo: {
    type: String,
    default: "",
  },
  perfil: {
    type: String,
    default: "",
  },
  refreshTokens: {
    type: [String],
    default: [],
  },
  credits: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true,
});

export const User = model("User", userSchema);