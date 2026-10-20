import os
import zipfile

root_dir = '/app/applet'
output_zip = '/app/applet/public/tunis-rfr-timetables.zip'
exclude_dirs = {'.git', 'node_modules', 'dist', 'dev-dist', '.aistudio', '__pycache__', '.gradle'}
exclude_files = {'tunis-rfr-timetables.zip'}

print("📦 Packaging Tunis RFR Timetables ZIP archive...")

with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude unwanted directories but explicitly preserve .github!
        dirnames[:] = [
            d for d in dirnames
            if d not in exclude_dirs and (not d.startswith('.') or d == '.github')
        ]

        for file in filenames:
            if file in exclude_files:
                continue
            # Skip hidden files except in .github or specific configs
            if file.startswith('.') and not (dirpath.endswith('.github') or '/.github' in dirpath or file == '.gitignore'):
                continue
            full_path = os.path.join(dirpath, file)
            arcname = os.path.relpath(full_path, root_dir)
            zipf.write(full_path, arcname)

size_mb = os.path.getsize(output_zip) / (1024 * 1024)
print(f"✨ Successfully created {output_zip} ({size_mb:.2f} MB)")

# Verify contents
with zipfile.ZipFile(output_zip, 'r') as z:
    all_files = z.namelist()
    workflow_files = [f for f in all_files if '.github' in f]
    print(f"📁 Total files packaged: {len(all_files)}")
    print(f"🚀 .github files included ({len(workflow_files)}): {workflow_files}")
