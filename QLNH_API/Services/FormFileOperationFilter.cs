using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using System.Linq;
using System.Reflection;

public class FormFileOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var parameters = context.MethodInfo.GetParameters();

        if (parameters.Any(p => p.GetCustomAttribute<FromFormAttribute>() != null || p.ParameterType == typeof(IFormFile)))
        {
            var schema = new OpenApiSchema
            {
                Type = "object",
                Properties = { },
                Required = new HashSet<string>()
            };

            foreach (var param in parameters)
            {
                var name = param.Name;
                var type = param.ParameterType;

                if (type == typeof(IFormFile))
                {
                    schema.Properties[name] = new OpenApiSchema
                    {
                        Type = "string",
                        Format = "binary"
                    };
                }
                else if (type == typeof(string))
                {
                    schema.Properties[name] = new OpenApiSchema
                    {
                        Type = "string"
                    };
                }

                schema.Required.Add(name);
            }

            operation.RequestBody = new OpenApiRequestBody
            {
                Content =
                {
                    ["multipart/form-data"] = new OpenApiMediaType
                    {
                        Schema = schema
                    }
                }
            };
        }
    }
}