const fs = require('fs');
const file = 'frontend/src/app/(dashboard)/appointments/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('const [deleteConfirmDocId')) {
  // Add state
  content = content.replace(
    'const [qrGenerating, setQrGenerating] = useState(false);',
    'const [qrGenerating, setQrGenerating] = useState(false);\n  const [deleteConfirmDocId, setDeleteConfirmDocId] = useState<string | null>(null);'
  );

  // Replace handleDeleteDocument
  const oldDelete = `  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("¿Seguro que quieres eliminar este documento? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(\`/api/documents/\${docId}\`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      await fetchAppointment();
    } catch (err) {
      console.error("Error eliminando documento:", err);
      alert("No se pudo eliminar el documento");
    }
  };`;

  const newDelete = `  const executeDeleteDocument = async (docId: string) => {
    try {
      const res = await fetch(\`/api/documents/\${docId}\`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      await fetchAppointment();
    } catch (err) {
      console.error("Error eliminando documento:", err);
      alert("No se pudo eliminar el documento");
    } finally {
      setDeleteConfirmDocId(null);
    }
  };

  const handleDeleteDocument = (docId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmDocId(docId);
  };`;

  content = content.replace(oldDelete, newDelete);

  // Add the Dialog before the final closing div
  const dialogMarkup = `
      {/* Modal Confirmar Borrado */}
      <Dialog open={!!deleteConfirmDocId} onOpenChange={(open) => { if (!open) setDeleteConfirmDocId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Eliminar documento</DialogTitle>
            <DialogDescription>
              ¿Seguro que quieres eliminar este documento? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmDocId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteConfirmDocId) executeDeleteDocument(deleteConfirmDocId);
            }}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
`;

  content = content.replace(/    <\/div>\n  \);\n}\n$/g, dialogMarkup);
  
  fs.writeFileSync(file, content, 'utf8');
  console.log("Patched successfully");
} else {
  console.log("Already patched");
}
