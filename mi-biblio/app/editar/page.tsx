"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { camposDesdeDocumento, documentoDesdeCampos, type CamposLibro } from "@/lib/libros";
import { FormularioLibro } from "../componentes/FormularioLibro";
import { Mensaje, Pagina } from "../componentes/Pagina";

const NO_EXISTE = "No se pudo cargar el libro. Puede que ya no exista.";

function Cargando() {
  return (
    <Pagina>
      <Mensaje>Cargando el libro…</Mensaje>
    </Pagina>
  );
}

function EditarLibro({ id }: { id: string }) {
  const router = useRouter();
  const [libro, setLibro] = useState<CamposLibro | "cargando" | "error">("cargando");

  useEffect(() => {
    getDoc(doc(db, "libros", id))
      .then((snapshot) => setLibro(snapshot.exists() ? camposDesdeDocumento(snapshot.data()) : "error"))
      .catch(() => setLibro("error"));
  }, [id]);

  if (libro === "cargando") return <Cargando />;
  if (libro === "error") {
    return (
      <Pagina>
        <Mensaje error>{NO_EXISTE}</Mensaje>
      </Pagina>
    );
  }

  return (
    <FormularioLibro
      subtitulo="editar ficha"
      textoGuardar="Guardar cambios"
      modoBusqueda="directa"
      inicial={libro}
      onGuardar={async (campos) => {
        await updateDoc(doc(db, "libros", id), documentoDesdeCampos(campos));
        router.push("/");
      }}
    />
  );
}

function EditarLibroContenido() {
  const id = useSearchParams().get("id");
  if (!id) {
    return (
      <Pagina>
        <Mensaje error>{NO_EXISTE}</Mensaje>
      </Pagina>
    );
  }
  return <EditarLibro id={id} />;
}

export default function EditarLibroPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <EditarLibroContenido />
    </Suspense>
  );
}
