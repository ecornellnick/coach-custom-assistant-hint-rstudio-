(async function(codioIDE, window) {
  
  const systemPrompt = `You are an assistant helping students understand and make progress themselves on their programming assignments. 
You will be provided with the .Rmd file they're working in.
Based on this information, provide only 1 relevant hint or idea for things they can try next to make progress.
Do not provide the full solution. 
Do not ask if they have any other questions.
  `
  
  codioIDE.coachBot.register("customHintsRStudio", "Provide a hint on what to do next", onButtonPress);

  async function onButtonPress() {
    try {
      try {
        await codioIDE.editor.save();
        console.log("Saved current file");
      } catch (saveError) {
        console.error("Error saving file:", saveError);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      let context = await codioIDE.coachBot.getContext();
      console.log("Context retrieved:", context);
      
      let filetree = await codioIDE.files.getStructure();
      console.log("Filetree retrieved:", filetree);
      
      async function getFilesWithExtension(obj, extension) {
        const files = {};

        async function traverse(path, obj) {
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              await traverse(path + "/" + key, obj[key]);
            } else if (obj[key] === 1 && key.toLowerCase().endsWith(extension)) {
              let filepath = path + "/" + key;
              filepath = filepath.substring(1);
              try {
                const fileContent = await codioIDE.files.getContent(filepath);
                files[key] = fileContent;
                console.log(`Successfully read file: ${filepath}`);
              } catch (readError) {
                console.error(`Error reading file ${filepath}:`, readError);
              }
            }
          }
        }

        await traverse("", obj);
        return files;
      }

      const files = await getFilesWithExtension(filetree, '.rmd');
      console.log("Files retrieved:", Object.keys(files));

      let student_files = "";

      for (const filename in files) {
        student_files = student_files.concat(`
        filename: ${filename}
        file content: 
        ${files[filename]}\n\n\n`);
      }

      console.log("Preparing to send prompt");

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
      } else {
        throw new Error("No response from coachBot");
      }

    } catch (error) {
      console.error("Main error:", error);
      codioIDE.coachBot.write("Sorry, I couldn't generate a hint at this time.");
      codioIDE.coachBot.showMenu();
    }
  }

})(window.codioIDE, window);
