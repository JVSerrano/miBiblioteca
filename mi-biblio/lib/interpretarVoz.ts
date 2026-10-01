import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";
import { firebaseApp } from "@/lib/firebase";

export interface LibroDictado {
  balda: number | null;
  columna: number | null;
  titulo: string;
}

const esquema = Schema.object({
  properties: {
    libros: Schema.array({
      items: Schema.object({
        properties: {
          balda: Schema.integer({ nullable: true }),
          columna: Schema.integer({ nullable: true }),
          titulo: Schema.string(),
        },
      }),
    }),
  },
});

const INSTRUCCIONES = `Recibes la transcripción de un dictado por voz en español en el que una persona cataloga los libros de su estantería.
Dice la ubicación ("balda 4 columna 1", "balda cuatro, columna uno") y a continuación los títulos de los libros que hay ahí.
Reglas:
- La ubicación se mantiene para todos los títulos siguientes hasta que se diga otra. Si solo cambia la columna, la balda se conserva, y al revés.
- Si un libro se dicta antes de indicar cualquier ubicación, usa null.
- Los números pueden venir en letras; devuélvelos como enteros.
- El reconocimiento de voz puede repetir palabras o frases enteras (tartamudeo: "la la la biblioteca la biblioteca de los muertos"). Colapsa esas repeticiones y devuelve cada libro una sola vez; no repitas el mismo título seguido salvo que claramente se dicten dos ejemplares.
- Devuelve un elemento por libro, con el título limpio (sin muletillas como "siguiente" o "y luego"), con mayúsculas y tildes correctas.
- Corrige errores evidentes de transcripción en títulos conocidos, pero no inventes libros ni añadas autores.`;

export async function interpretarDictado(texto: string): Promise<LibroDictado[]> {
  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  const modelo = getGenerativeModel(ai, {
    model: "gemini-2.5-flash",
    systemInstruction: INSTRUCCIONES,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: esquema,
      temperature: 0,
    },
  });
  const res = await modelo.generateContent(texto);
  const datos = JSON.parse(res.response.text()) as { libros?: LibroDictado[] };
  return (datos.libros ?? []).filter((l) => l.titulo?.trim());
}
