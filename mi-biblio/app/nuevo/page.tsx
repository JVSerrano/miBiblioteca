"use client";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { documentoDesdeCampos } from "@/lib/libros";
import { FormularioLibro } from "../componentes/FormularioLibro";

export default function NuevoLibroPage() {
  return (
    <FormularioLibro
      subtitulo="ficha nueva"
      textoGuardar="Guardar en la balda"
      modoBusqueda="lista"
      mensajeGuardado="Libro archivado. Ya puedes dar de alta el siguiente."
      onGuardar={async (campos) => {
        await addDoc(collection(db, "libros"), {
          ...documentoDesdeCampos(campos),
          fechaAlta: serverTimestamp(),
        });
      }}
    />
  );
}
