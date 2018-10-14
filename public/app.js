// When user clicks the delete button for a comment
$(document).on("click", "#delete", function(event) {
    console.log("delete works");
    event.preventDefault();
    // Save the p tag that encloses the button
    var selected = $(this).parent();
    // Make an AJAX GET request to delete the specific note this uses the data-id of the p-tag, which is linked to the specific note
    $.ajax({
      type: "GET",
      url: location.href + "/" + $(this).data("id"),
  
      // On successful call
      success: function(res) {
        // Remove the p-tag from the DOM
        selected.remove();
      }
    });
  });