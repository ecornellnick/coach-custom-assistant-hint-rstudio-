(async function(codioIDE, window) {
  
  const systemPrompt = `You are an assistant helping students understand and make progress themselves on their programming assignments. 
You will be provided with the .Rmd file they're working in.
Based on this information, provide at most 2 relevant hints or ideas for things they can try next to make progress.
Do not provide the full solution. 
Do not ask if they have any other questions.
  `
  
  codioIDE.coachBot.register("customHintsRStudio", "Provide a hint on what to do next", onButtonPress);

  async function onButtonPress() {
    try {
      // Get all open editors
      const openEditors = await codioIDE.editor.getOpenFiles();
      
      // Save all open .Rmd files
      for (const editor of openEditors) {
        if (editor.path.toLowerCase().endsWith('.rmd')) {
          await codioIDE.editor.saveFile(editor.path);
        }
      }
      
      // Add a small delay to ensure saves complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Rest of your existing code...
      let context = await codioIDE.coachBot.getContext();
      let filetree = await codioIDE.files.getStructure();
      
      async function getFilesWithExtension(obj, extension) {
        const files = {};

        async function traverse(path, obj) {
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              await traverse(path + "/" + key, obj[key]);
            } else if (obj[key] === 1 && key.toLowerCase().endsWith(extension)) {
              let filepath = path + "/" + key;
              filepath = filepath.substring(1);
              const fileContent = await codioIDE.files.getContent(filepath);
              files[key] = fileContent;
            }
          }
        }

        await traverse("", obj);
        return files;
      }

      const files = await getFilesWithExtension(filetree, '.rmd');

      let student_files = "";

      for (const filename in files) {
        student_files = student_files.concat(`
        filename: ${filename}
        file content: 
        ${files[filename]}\n\n\n`);
      }

      const userPrompt = `Here are the student's code files:

<code>
${student_files}
</code> 

If <code> is empty, assume that it's not available. 

Phrase your hints directly addressing the student as 'you'.
Phrase your hints as questions or suggestions.
`;

      const result = await codioIDE.coachBot.ask({
        systemPrompt: systemPrompt,
        messages: [{"role": "user", "content": userPrompt}]
      });

      if (result && result.response) {
        codioIDE.coachBot.write(result.response);
      }

    } catch (error) {
      codioIDE.coachBot.write("An unexpected error occurred");
      codioIDE.coachBot.showMenu();
    }
  }

})(window.codioIDE, window);
