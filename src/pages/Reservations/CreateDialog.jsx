import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";

const CreateDialog = ({ open, onClose, onCreate, bookId, setBookId }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle className="font-bold text-lg">
        Create New Reservation
      </DialogTitle>
      <DialogContent>
        <p className="text-gray-600 mb-3 text-sm">
          Enter the <strong>Book ID</strong> you want to reserve.
        </p>
        <TextField
          label="Book ID"
          variant="outlined"
          fullWidth
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onCreate}
          variant="contained"
          color="primary"
          disabled={!bookId.trim()}
        >
          Reserve
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDialog;
