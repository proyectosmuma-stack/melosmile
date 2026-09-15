const fs = require('fs');
const file = 'frontend/src/app/(dashboard)/patients/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('const [deleteConfirmDocId')) {
  // Add state somewhere around line 84 (where other state is defined)
  content = content.replace(
    'const [isAddingFamilyMember, setIsAddingFamilyMember] = useState(false);',
    'const [isAddingFamilyMember, setIsAddingFamilyMember] = useState(false);\n  const [deleteConfirmDocId, setDeleteConfirmDocId] = useState<string | null>(null);'
  );

  // Replace handleDeleteDocument inline button in patients/[id]/page.tsx
  // The button looks like this:
  /*
                      <button
                        onClick={async () => {
                          if (!confirm("¿Eliminar este documento? Esta acción no se puede deshacer.")) return;
                          const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
                          if (res.ok) fetchAll();
                          else alert("No se pudo eliminar el documento");
                        }}
  */
  const oldBtn = `                      <button
                        onClick={async () => {
                          if (!confirm("¿Eliminar este documento? Esta acción no se puede deshacer.")) return;
                          const res = await fetch(\`/api/documents/\${doc.id}\`, { method: "DELETE" });
                          if (res.ok) fetchAll();
                          else alert("No se pudo eliminar el documento");
                        }}`;

  const newBtn = `                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteConfirmDocId(doc.id);
                        }}`;
  
  content = content.replace(oldBtn, newBtn);

  // add the execute delete function somewhere before the return
  const executeFn = `  const executeDeleteDocument = async (docId: string) => {
    try {
      const res = await fetch(\`/api/documents/\${docId}\`, { method: "DELETE" });
      if (res.ok) fetchAll();
      else alert("No se pudo eliminar el documento");
    } catch (e) {
      alert("Error eliminando documento");
    } finally {
      setDeleteConfirmDocId(null);
    }
  };
`;

  content = content.replace('  if (loading) {', executeFn + '\n  if (loading) {');

  // Add the Dialog before the final closing div
  const dialogMarkup = `
      {/* Modal Confirmar Borrado Documento */}
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
