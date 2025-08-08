(async function(codioIDE, window) {
  
  const systemPrompt = `You are an assistant helping students understand and make progress themselves on their programming assignments. 
You will be provided with the .Rmd file they're working in.
Based on this information, provide at most 2 relevant hints or ideas for things they can try next to make progress.
Do not provide the full solution. 
Do not ask if they have any other questions.
  `
  
  // register(id: unique button id, name: name of button visible in Coach, function: function to call when button is clicked) 
  codioIDE.coachBot.register("customHintsRStudio", "Provide a hint on what to do next", onButtonPress);

  // function called when I have a question button is pressed
  async function onButtonPress() {
    try {
      // automatically collects all available context 
      // returns the following object: {guidesPage, assignmentData, files, error}
      let context = await codioIDE.coachBot.getContext();
      
      // gets the filetree as an object
      let filetree = await codioIDE.files.getStructure();
      
      // recursively search filetree for files with specific extension
      async function getFilesWithExtension(obj, extension) {
        const files = {};

        async function traverse(path, obj) {
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              // appending next object to traverse to path
              await traverse(path + "/" + key, obj[key]);
            } else if (obj[key] === 1 && key.toLowerCase().endsWith(extension)) {
              let filepath = path + "/" + key;
              // removed the first / from filepath
              filepath = filepath.substring(1);
              const fileContent = await codioIDE.files.getContent(filepath);
              files[key] = fileContent;
            }
          }
        }

        await traverse("", obj);
        return files;
      }

      // retrieve files and file content with specific extension
      const files = await getFilesWithExtension(filetree, '.rmd');

      let student_files = "";

      // join all fetched files as one string for LLM context 
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

      // Handle the result
      if (result && result.response) {
        codioIDE.coachBot.write(result.response);
      }

    } catch (error) {
      codioIDE.coachBot.write("An unexpected error occurred");
      codioIDE.coachBot.showMenu();
    }
  }

})(window.codioIDE, window);
