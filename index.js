// Wrapping the whole extension in a JS function 
// (ensures all global variables set in this extension cannot be referenced outside its scope)
(async function(codioIDE, window) {
  
      const systemPrompt = `You are an assistant helping students understand and make progress themselves on their programming assignments. 
You will be provided with the .Rmd file they're working in.
Based on this information, provide at most 2 relevant hints or ideas for things they can try next to make progress.
Do not provide the full solution. 
Do not ask if they have any other questions.
      `
  
  // register(id: unique button id, name: name of button visible in Coach, function: function to call when button is clicked) 
  codioIDE.coachBot.register("customHintsRStudio", "Provide a hint on what to do next", onButtonPress)

  // function called when I have a question button is pressed
  async function onButtonPress() {

    // automatically collects all available context 
    // returns the following object: {guidesPage, assignmentData, files, error}
    let context = await codioIDE.coachBot.getContext()
    // console.log(context)

    // gets the filetree as an object
    let filetree = await codioIDE.files.getStructure()
    // console.log("filetree", filetree)
    
    // recursively search filetree for files with specific extension
    async function getFilesWithExtension(obj, extension) {
        const files = {};

        async function traverse(path, obj) {
            for (const key in obj) {
                if (typeof obj[key] === 'object') {
                  // appending next object to traverse to path
                  await traverse(path + "/" + key, obj[key]);
                } else if (obj[key] === 1 && key.toLowerCase().endsWith(extension)) {
                    
                    let filepath = path + "/" + key
                    // removed the first / from filepath
                    filepath = filepath.substring(1)
                    const fileContent = await codioIDE.files.getContent(filepath)
                    files[key] = fileContent
                }
                }
        }

        await traverse("", obj);
        return files;
    }

    // retrieve files and file content with specific extension
    const files = await getFilesWithExtension(filetree, '.rmd')

    let student_files = ""

    // join all fetched files as one string for LLM context 
    for (const filename in files) {
        student_files = student_files.concat(`
        filename: ${filename}
        file content: 
        ${files[filename]}\n\n\n`)
    }
    // console.log(student_files)

    // try {
    //     input = await codioIDE.coachBot.input("Please paste the error message you want me to explain!")
    // } catch (e) {
    //      if (e.message == "Cancelled") 
    //         codioIDE.coachBot.write("Please feel free to have any other error messages explained!")
    //         codioIDE.coachBot.showMenu()
    //         return
    // }

    // validation prompt to ensure pasted text is actually an error message
    const valPrompt = `<Instructions>

Please determine whether the following text appears to be a programming error message or not:

<text>
${input}
</text>

Output your final Yes or No answer in JSON format with the key 'answer'

Focus on looking for key indicators that suggest the text is an error message, such as:

- Words like "error", "exception", "stack trace", "traceback", etc.
- Line numbers, file names, or function/method names
- Language that sounds like it is reporting a problem or issue
- Language that sounds like it is providing feedback
- Technical jargon related to coding/programming

If you don't see clear signs that it is an error message, assume it is not. Only answer "Yes" if you are quite confident it is an error message. 
If it is not a traditional error message, only answer "Yes" if it sounds like it is providing feedback as part of an automated grading system.

</Instructions>`
    
    
    // const validation_result = await codioIDE.coachBot.ask({
    //     systemPrompt: "You are a helpful assistant.",
    //     userPrompt: valPrompt
    // }, {stream:false, preventMenu: true})


    // // if validation result is yes, pass pasted text to error explanation API call with all context
    // if (validation_result.result.includes("Yes")) {
    //     //Define your assistant's userPrompt - this is where you will provide all the context you collected along with the task you want the LLM to generate text for.

      const userPrompt = `Here are the student's code files:

<code>
${student_files}
</code> 

If <code> is empty, assume that it's not available. 

Phrase your hints directly addressing the student as 'you'.
Phrase your hints as questions or suggestions.
`

      try {
        const result = await codioIDE.coachBot.ask({
            systemPrompt: systemPrompt,
            messages: [{"role": "user", "content": userPrompt}]
        })
        // Handle the result
        if (result && result.response) {
          codioIDE.coachBot.write(result.response)
        }
      } catch (apiError) {
        codioIDE.coachBot.write("An error occurred while processing your request")
        codioIDE.coachBot.showMenu()
      }

    } catch (error) {
      codioIDE.coachBot.write("An unexpected error occurred")
      codioIDE.coachBot.showMenu()
    }
  }


})(window.codioIDE, window)
 

  
  
