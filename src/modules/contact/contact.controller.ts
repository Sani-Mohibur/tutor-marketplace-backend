import { Request, Response } from "express";
import { contactService } from "./contact.service.js";

export const contactController = {
  createContact: async (req: Request, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: "All fields are required.",
        });
      }

      const contact = await contactService.createContact({
        name,
        email,
        subject,
        message,
      });

      res.status(201).json({
        success: true,
        data: contact,
      });
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({
        success: false,
        message: "Failed to submit contact message.",
      });
    }
  },

  getAllContacts: async (req: Request, res: Response) => {
    try {
      const result = await contactService.getAllContacts(req.query);

      res.status(200).json({
        success: true,
        meta: result.meta,
        data: result.data,
      });
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve contact messages.",
      });
    }
  },
};
